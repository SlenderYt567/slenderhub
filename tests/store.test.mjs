import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';

async function load(file) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { normalizeProduct, addCartItem, removeCartItem, reconcileCart, isCartItemUnavailable } = await load('lib/products.ts');
const { saveProduct, removeProduct, fetchProduct } = await load('lib/productRepository.ts');
const product = {
  id: 'test-product', title: 'Produto', description: 'Descrição', price: 10,
  image: 'https://example.com/product.png', category: 'item', stock: 5, featured: true,
  variants: [{ id: 'v1', name: 'A', price: 2.5, image: 'https://example.com/a.png', stock: 2 }, { id: 'v2', name: 'B', price: 3.75 }],
};

test('validates product and variant numbers without truncating invalid stock', () => {
  assert.equal(normalizeProduct(product).price, 2.5);
  for (const stock of [-1, 1.5, NaN, Infinity]) assert.throws(() => normalizeProduct({ ...product, stock }));
  assert.throws(() => normalizeProduct({ ...product, title: '   ' }));
  assert.throws(() => normalizeProduct({ ...product, variants: [{ ...product.variants[0], price: NaN }] }));
  assert.throws(() => normalizeProduct({ ...product, variants: [product.variants[0], product.variants[0]] }));
});

test('cart requires a valid variant and respects per-variant and shared stock', () => {
  assert.throws(() => addCartItem([], product, 1));
  assert.throws(() => addCartItem([], product, 1, { id: 'unknown' }));
  for (const quantity of [0, -1, 1.2, NaN]) assert.throws(() => addCartItem([], product, quantity, product.variants[0]));
  let cart = addCartItem([], product, 2, product.variants[0]);
  assert.throws(() => addCartItem(cart, product, 1, product.variants[0]));
  cart = addCartItem(cart, product, 3, product.variants[1]);
  assert.throws(() => addCartItem(cart, product, 1, product.variants[1]));
  assert.equal(removeCartItem(cart, product.id, 'v1').length, 1);
  assert.equal(removeCartItem(cart, product.id, 'v1')[0].selectedVariant.id, 'v2');
  assert.equal(cart[0].price, 2.5);
});

test('cart reflects price changes, product removal, and unavailable inventory', () => {
  const cart = addCartItem([], product, 2, product.variants[0]);
  const changed = { ...product, variants: [{ ...product.variants[0], price: 9, stock: 1 }] };
  const refreshed = reconcileCart(cart, [changed]);
  assert.equal(refreshed[0].price, 9);
  assert.ok(isCartItemUnavailable(refreshed[0], refreshed));
  assert.deepEqual(reconcileCart(cart, []), []);
  assert.deepEqual(reconcileCart(cart, [{ ...product, variants: [] }]), []);
  assert.throws(() => addCartItem([], { ...product, stock: 0 }, 1, product.variants[0]));
});

test('repository requires confirmed save/delete and propagates missing migration or RLS errors', async () => {
  await assert.rejects(saveProduct({ rpc: async () => ({ error: { code: 'PGRST202' } }) }, product, true), /migrate_variant_category/);
  await assert.rejects(saveProduct({ rpc: async () => ({ data: null }) }, product, true), /confirmou/);
  const denied = new Error('permission denied');
  const query = { delete() { return this; }, select() { return this; }, eq() { return this; }, single: async () => ({ error: denied }), maybeSingle: async () => ({ error: denied }) };
  const client = { from: () => query };
  await assert.rejects(removeProduct(client, product.id), /permission denied/);
  await assert.rejects(fetchProduct(client, product.id), /permission denied/);
});

test('PostgreSQL: atomic product lifecycle, rollback, and access control', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  // Use the repository's actual legacy product tables and policies, not a rewritten schema.
  const schema = await readFile('schema.sql', 'utf8');
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
      $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS
      $$ SELECT COALESCE(current_setting('test.admin', true), 'false') = 'true' $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
  `);
  const tables = schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS public.products'), schema.indexOf('-- 5. DIGITAL KEYS'));
  await db.exec(tables);
  await db.exec(`CREATE TABLE public.profiles(id uuid PRIMARY KEY, is_admin boolean DEFAULT false, email text);
    INSERT INTO public.profiles(id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'fixture@example.invalid');
    GRANT SELECT, UPDATE ON public.profiles TO authenticated;
    CREATE POLICY "Escrita produtos admin" ON public.products FOR ALL USING (true);
    CREATE POLICY "Escrita variantes admin" ON public.product_variants FOR ALL USING (true);`);
  const policies = schema.slice(schema.indexOf('-- products: qualquer um vê'), schema.indexOf('-- chat_sessions: admin'));
  await db.exec(policies);
  const migration = await readFile('migrate_variant_category.sql', 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Safe to reapply during deployment.
  await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.product_variants TO authenticated;
    SET ROLE authenticated; SET test.uid = '00000000-0000-0000-0000-000000000001'; SET test.admin = 'true';`);
  const save = async (value, create) => (await db.query('SELECT public.save_store_product($1::jsonb, $2) AS product', [JSON.stringify(value), create])).rows[0].product;
  const get = async id => (await db.query('SELECT * FROM public.products WHERE id = $1', [id])).rows[0];

  await t.test('creates all variants and retains images and featured', async () => {
    const saved = await save(product, true);
    assert.equal(saved.price, 2.5);
    assert.equal(saved.featured, true);
    assert.equal(saved.variants.length, 2);
    assert.equal(saved.variants.find(v => v.id === 'v1').image, product.variants[0].image);
  });
  await t.test('edits, removes and adds variants without replacing retained IDs', async () => {
    const updated = { ...product, title: 'Editado', variants: [{ ...product.variants[0], price: 7 }, { id: 'v3', name: 'C', price: 4.2, stock: 0 }] };
    const saved = await save(updated, false);
    assert.equal(saved.price, 4.2);
    assert.deepEqual(saved.variants.map(v => v.id).sort(), ['v1', 'v3']);
    assert.equal(saved.variants.find(v => v.id === 'v1').image, product.variants[0].image);
  });
  await t.test('variant conflict rolls back the parent update and insert', async () => {
    await save({ ...product, id: 'other', variants: [{ id: 'foreign', name: 'Foreign', price: 5 }] }, true);
    const invalid = { ...product, title: 'MUST ROLLBACK', variants: [{ id: 'foreign', name: 'Conflict', price: 1 }] };
    await assert.rejects(save(invalid, false), /outro produto/);
    assert.equal((await get(product.id)).title, 'Editado');
    await assert.rejects(save({ ...invalid, id: 'failed-create' }, true), /outro produto/);
    assert.equal(await get('failed-create'), undefined);
  });
  await t.test('rejects invalid prices, fractional stock, duplicate IDs and nonexistent updates', async () => {
    for (const stock of [-1, 1.5]) await assert.rejects(save({ ...product, stock }, false));
    await assert.rejects(save({ ...product, variants: [{ id: 'bad', name: 'Bad', price: -1 }] }, false));
    await assert.rejects(save({ ...product, variants: [product.variants[0], product.variants[0]] }, false));
    await assert.rejects(save({ ...product, id: 'missing' }, false), /não encontrado/);
  });
  await t.test('blocks customers and anonymous visitors', async () => {
    await db.exec("SET test.admin = 'false'");
    await assert.rejects(save(product, false), /administradores/);
    await assert.rejects(db.exec("UPDATE public.profiles SET is_admin = true"), /permissões/);
    await db.exec("UPDATE public.profiles SET email = 'edited@example.invalid'");
    assert.equal((await db.query('UPDATE public.products SET price = 0 RETURNING id')).rows.length, 0);
    assert.equal((await db.query('DELETE FROM public.product_variants RETURNING id')).rows.length, 0);
    await assert.rejects(db.exec("INSERT INTO public.products(id,title,price) VALUES ('unauthorized','Bad',1)"), /row-level security/);
    await db.exec('SET ROLE anon');
    await assert.rejects(save(product, false), /permission denied/);
    await db.exec("SET ROLE authenticated; SET test.admin = 'true'");
    await db.exec('UPDATE public.profiles SET is_admin = true');
  });
  await t.test('removes every variant and deletes product with cascading variants', async () => {
    const saved = await save({ ...product, variants: [], price: 12 }, false);
    assert.deepEqual(saved.variants, []);
    assert.equal(saved.price, 12);
    await save(product, false);
    await db.query('DELETE FROM public.products WHERE id = $1', [product.id]);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.product_variants WHERE product_id = $1', [product.id])).rows[0].count, 0);
  });
});
