import { createHash } from 'node:crypto';
import { PRODUCT_SELECT } from '../lib/products.js';
import { CheckoutError, parseItems, priceItems } from '../server/stripePricing.js';
import { authenticatedUser, handlePaymentError, paymentServices, siteOrigin, STRIPE_SOURCE } from '../server/stripe.js';

export const config = { runtime: 'nodejs' };
export function createCheckoutHandler(services = paymentServices) {
  return async function handler(req: any, res: any) {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method Not Allowed' });
    try {
      const { stripe, db } = services();
      const user = await authenticatedUser(req, db);
      if (req.method === 'GET') {
        const id = req.query?.session_id;
        if (typeof id !== 'string' || !/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(id)) throw new CheckoutError('Sessão inválida.');
        const session = await stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent'] });
        if (session.client_reference_id !== user.id || session.metadata?.source !== STRIPE_SOURCE) throw new CheckoutError('Pedido não encontrado.', 404);
        const { data: order, error } = await db.from('chat_sessions').select('id,payment_status').eq('id', id).eq('owner_id', user.id).maybeSingle();
        if (error) throw new Error('Order query failed');
        const intent = session.payment_intent;
        const failed = intent && typeof intent !== 'string' && intent.status === 'requires_payment_method' && !!intent.last_payment_error;
        return res.status(200).json({
          status: session.payment_status === 'paid' ? (order?.payment_status === 'verified' ? 'paid' : 'confirming')
            : session.status === 'expired' ? 'expired' : failed ? 'failed' : 'pending',
          orderId: order?.payment_status === 'verified' && session.payment_status === 'paid' ? order.id : null,
          amount: session.amount_total, currency: session.currency,
        });
      }
      const body = req.body || {};
      const items = parseItems(body.items);
      const email = typeof body.contactEmail === 'string' ? body.contactEmail.trim() : '';
      const username = typeof body.robloxUsername === 'string' ? body.robloxUsername.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new CheckoutError('Informe um e-mail válido.');
      if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) throw new CheckoutError('Informe um usuário Roblox válido (sem @).');
      if (typeof body.attemptId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.attemptId)) throw new CheckoutError('Identificador do checkout inválido.');
      const { data, error } = await db.from('products').select(PRODUCT_SELECT).in('id', [...new Set(items.map(i => i.productId))]);
      if (error) throw new Error('Catalogue unavailable');
      const { lines } = priceItems(items, (data || []) as any);
      const origin = siteOrigin();
      const params = {
        mode: 'payment' as const, integration_identifier: 'zw-store-hosted-xqmnprst',
        adaptive_pricing: { enabled: false }, client_reference_id: user.id, customer_email: email,
        metadata: { source: STRIPE_SOURCE, roblox_username: username },
        payment_intent_data: { metadata: { source: STRIPE_SOURCE, user_id: user.id } },
        line_items: lines.map(line => ({ quantity: line.quantity, price_data: {
          currency: 'usd', unit_amount: line.unitAmount,
          product_data: { name: line.title, ...(line.variant ? { description: line.variant } : {}),
            ...(line.image?.startsWith('https://') ? { images: [line.image] } : {}),
            metadata: { product_id: line.productId, variant_id: line.variantId || '', variant_name: line.variant || '' },
          },
        } })),
        success_url: `${origin}/checkout/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?stripe=cancelled`,
      };
      const digest = createHash('sha256').update(JSON.stringify(params)).digest('hex');
      const session = await stripe.checkout.sessions.create(params, { idempotencyKey: `zw-${user.id}-${body.attemptId}-${digest}` });
      if (!session.url) throw new Error('Missing checkout URL');
      return res.status(200).json({ url: session.url });
    } catch (error) { return handlePaymentError(res, error); }
  }
}
export default createCheckoutHandler();
