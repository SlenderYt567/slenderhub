import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import Stripe from 'stripe';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

await mkdir('tests/.generated', { recursive: true });
async function load(entry, name) {
  const outfile = path.resolve(`tests/.generated/${name}.mjs`);
  await build({ entryPoints: [entry], outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm' });
  return import(pathToFileURL(outfile).href);
}
const pricing = await load('server/stripePricing.ts', 'stripe-pricing');
const { recordPaidSession, STRIPE_SOURCE } = await load('server/stripe.ts', 'stripe-server');
const { createCheckoutHandler } = await load('api/stripe-checkout.ts', 'stripe-checkout');
const { createWebhookHandler, rawWebhookBody } = await load('api/webhooks/stripe.ts', 'stripe-webhook');
const { default: legacy } = await load('api/stripe-intent.ts', 'stripe-legacy');
const product = { id: 'pet', title: 'Pet', price: 10, stock: 5, image: '', is_draft: false,
  variants: [{ id: 'gold', name: 'Gold', price: 2.55, stock: 3 }, { id: 'silver', name: 'Silver', price: 1.25, stock: 4 }] };
function response() { return { code: 200, payload: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.payload = body; return this; } }; }
const request = { method: 'POST', headers: { authorization: 'Bearer valid' }, body: {
  amount: 0.01, currency: 'brl', contactEmail: 'buyer@example.com', robloxUsername: 'Player123',
  attemptId: '00000000-0000-4000-8000-000000000000', items: [{ productId: 'pet', variantId: 'gold', quantity: 2, price: 0.01 }],
} };

test('server pricing ignores tampered browser totals and combines duplicate lines', () => {
  const items = pricing.parseItems([...request.body.items, ...request.body.items.map(i => ({ ...i, quantity: 1 }))]);
  const quote = pricing.priceItems(items, [product]);
  assert.equal(quote.total, 765);
  assert.equal(quote.lines.length, 1);
  assert.equal(quote.lines[0].unitAmount, 255);
});
test('rejects unavailable variants, drafts, malformed quantities and aggregate stock overflow', () => {
  for (const quantity of [0, -1, 1.5, Infinity, '2', 1000]) assert.throws(() => pricing.parseItems([{ productId: 'pet', quantity }]));
  assert.throws(() => pricing.parseItems([]));
  assert.throws(() => pricing.priceItems([{ productId: 'pet', quantity: 1 }], [product]));
  assert.throws(() => pricing.priceItems([{ productId: 'pet', variantId: 'bad', quantity: 1 }], [product]));
  assert.throws(() => pricing.priceItems(pricing.parseItems(request.body.items), [{ ...product, is_draft: true }]));
  assert.throws(() => pricing.priceItems(pricing.parseItems([
    { productId: 'pet', variantId: 'gold', quantity: 3 }, { productId: 'pet', variantId: 'silver', quantity: 3 },
  ]), [product]));
  assert.throws(() => pricing.priceItems(pricing.parseItems([{ productId: 'pet', variantId: 'gold', quantity: 4 }]), [product]));
});
test('checkout uses persisted USD prices, server-owned redirect and a stable idempotency key', async () => {
  let called;
  const services = () => ({ db: {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    from: () => ({ select: () => ({ in: async () => ({ data: [product] }) }) }),
  }, stripe: { checkout: { sessions: { create: async (params, options) => { called = { params, options }; return { url: 'https://checkout.stripe.com/test' }; } } } } });
  const handler = createCheckoutHandler(services);
  const res = response(); await handler(request, res);
  assert.equal(res.code, 200);
  assert.equal(called.params.line_items[0].price_data.unit_amount, 255);
  assert.equal(called.params.line_items[0].price_data.currency, 'usd');
  assert.equal(called.params.line_items[0].quantity, 2);
  assert.equal(called.params.client_reference_id, 'owner');
  assert.equal(called.params.success_url, 'https://www.zwhub.store/checkout/stripe-return?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(called.params.payment_method_types, undefined);
  const key = called.options.idempotencyKey;
  await handler(request, response()); assert.equal(called.options.idempotencyKey, key);
  const denied = response(); await handler({ ...request, headers: {} }, denied); assert.equal(denied.code, 401);
});
test('return endpoint denies another owner and never trusts success query parameters', async () => {
  const handler = createCheckoutHandler(() => ({ db: { auth: { getUser: async () => ({ data: { user: { id: 'other' } } }) } },
    stripe: { checkout: { sessions: { retrieve: async () => ({ client_reference_id: 'owner', metadata: { source: STRIPE_SOURCE }, payment_status: 'paid' }) } } } }));
  const res = response(); await handler({ method: 'GET', headers: request.headers, query: { session_id: 'cs_test_123', success: 'true' } }, res);
  assert.equal(res.code, 404);
});

function paidFixture() {
  const session = { id: 'cs_test_123', mode: 'payment', metadata: { source: STRIPE_SOURCE, roblox_username: 'Player123' },
    client_reference_id: 'owner', currency: 'usd', payment_status: 'paid', amount_total: 510, customer_email: 'buyer@example.com' };
  const records = new Map();
  const db = { from: () => ({
    upsert: async (row, options) => { assert.equal(options.ignoreDuplicates, true); if (!records.has(row.id)) records.set(row.id, row); return {}; },
    select: () => ({ eq: (_field, id) => ({ single: async () => ({ data: records.get(id) }) }) }),
  }) };
  const stripe = { checkout: { sessions: {
    retrieve: async () => session,
    listLineItems: async function* () { yield { currency: 'usd', quantity: 2, price: { unit_amount: 255, product: { name: 'Pet', metadata: { product_id: 'pet', variant_name: 'Gold' } } } }; },
  } } };
  return { session, records, db, stripe };
}
test('webhook persistence is idempotent and preserves delivery state on retries', async () => {
  const f = paidFixture();
  assert.equal(await recordPaidSession(f.stripe, f.db, f.session.id), f.session.id);
  const row = f.records.get(f.session.id); row.delivery_status = 'delivered';
  await recordPaidSession(f.stripe, f.db, f.session.id);
  assert.equal(f.records.size, 1); assert.equal(row.total_amount, 5.1);
  assert.equal(row.payment_status, 'verified'); assert.equal(row.delivery_status, 'delivered');
  assert.equal(row.cart_items[0].variant, 'Gold');
});
test('unpaid, foreign sessions and mismatched totals cannot produce a paid order', async () => {
  for (const change of [{ payment_status: 'unpaid' }, { metadata: { source: 'other' } }]) {
    const f = paidFixture(); Object.assign(f.session, change);
    assert.equal(await recordPaidSession(f.stripe, f.db, f.session.id), null); assert.equal(f.records.size, 0);
  }
  const f = paidFixture(); f.session.amount_total = 1;
  await assert.rejects(recordPaidSession(f.stripe, f.db, f.session.id)); assert.equal(f.records.size, 0);
});
test('signed completed/async-success events persist orders; bad signatures and failures do not', async () => {
  const sdk = new Stripe('sk_test_local_mock_only');
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_mock_only';
  for (const type of ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed']) {
    const f = paidFixture(); f.stripe.webhooks = sdk.webhooks;
    const payload = JSON.stringify({ id: 'evt_test', type, data: { object: f.session } });
    const signature = sdk.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const handler = createWebhookHandler(() => f);
    const invalid = response(); await handler({ method: 'POST', body: payload, headers: { 'stripe-signature': 'invalid' } }, invalid);
    assert.equal(invalid.code, 400); assert.equal(f.records.size, 0);
    const valid = response(); await handler({ method: 'POST', body: payload, headers: { 'stripe-signature': signature } }, valid);
    assert.equal(valid.code, 200); assert.equal(f.records.size, type.endsWith('failed') ? 0 : 1);
  }
  await assert.rejects(rawWebhookBody({ body: { parsed: true } }));
});
test('legacy browser-priced payment endpoint is disabled', () => {
  const res = response(); legacy(request, res); assert.equal(res.code, 410);
});

test('Vercel raw stream is read without invoking its lazy JSON body getter', async () => {
  const payload = '{ "spacing":  true, "accent": "é" }';
  const req = Readable.from([Buffer.from(payload)]);
  Object.defineProperty(req, 'body', { get() { throw new Error('Body getter must not be read'); } });
  assert.equal((await rawWebhookBody(req)).toString(), payload);
});

test('database prevents a browser from inserting a paid or Stripe order while preserving manual checkout', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;
      grant usage on schema public, auth to authenticated;
      create table public.chat_sessions (
        id text primary key, owner_id uuid, payment_status text, status text,
        delivery_status text default 'pending', verified_at timestamptz, payment_method text
      );
      alter table public.chat_sessions enable row level security;
      grant insert on public.chat_sessions to authenticated;
      create policy chat_sessions_insert_owner on public.chat_sessions for insert to authenticated
        with check (owner_id = (select auth.uid()));
    `);
    await db.exec(await readFile('server/stripe-order-policy.sql', 'utf8'));
    await db.exec('set role authenticated');
    const insert = (id, payment = 'pending', method = 'Pix', owner = '00000000-0000-4000-8000-000000000001', verified = null) =>
      db.query("insert into public.chat_sessions (id,owner_id,payment_status,status,payment_method,verified_at) values ($1,$2,$3,'pending_payment',$4,$5)", [id, owner, payment, method, verified]);
    await insert('manual-1');
    await insert('manual-2', 'pending', 'Crypto LTC');
    await assert.rejects(insert('fake-paid', 'verified'));
    await assert.rejects(insert('cs_fake'));
    await assert.rejects(insert('fake-method', 'pending', 'Stripe (USD)'));
    await assert.rejects(insert('fake-date', 'pending', 'Pix', undefined, '2026-01-01T00:00:00Z'));
    await assert.rejects(insert('other', 'pending', 'Pix', '00000000-0000-4000-8000-000000000002'));
    await db.exec('reset role');
    await insert('cs_server', 'verified', 'Stripe (USD)');
    assert.equal((await db.query('select count(*)::int as count from public.chat_sessions')).rows[0].count, 3);
  } finally { await db.close(); }
});
