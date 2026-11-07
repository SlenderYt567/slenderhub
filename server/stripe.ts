import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CheckoutError } from './stripePricing.js';

export const STRIPE_SOURCE = 'zw-store-checkout-v1';
export function paymentServices() {
  const key = process.env.STRIPE_SECRET_KEY;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.STRIPE_ENABLED !== 'true' || !key || !url || !serviceKey || !process.env.STRIPE_WEBHOOK_SECRET) throw new CheckoutError('O pagamento Stripe ainda não está disponível.', 503);
  return {
    stripe: new Stripe(key, { maxNetworkRetries: 2, timeout: 20000 }),
    db: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}
export async function authenticatedUser(req: any, db: SupabaseClient) {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) throw new CheckoutError('Entre na sua conta para pagar.', 401);
  const { data, error } = await db.auth.getUser(header.slice(7));
  if (error || !data.user || data.user.is_anonymous) throw new CheckoutError('Sua sessão expirou. Entre novamente.', 401);
  return data.user;
}
export function siteOrigin() {
  const url = new URL(process.env.SITE_URL || 'https://www.zwhub.store');
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) throw new CheckoutError('Endereço da loja não configurado.', 503);
  return url.origin;
}
export function handlePaymentError(res: any, error: unknown) {
  if (error instanceof CheckoutError) return res.status(error.status).json({ error: error.message });
  console.error('Stripe checkout failed:', error instanceof Error ? error.name : 'UnknownError');
  return res.status(500).json({ error: 'Não foi possível processar o pagamento. Tente novamente ou fale com o suporte.' });
}

// Only the signed webhook calls this. Session ID makes writes idempotent without
// overwriting a delivery that an administrator has already completed.
export async function recordPaidSession(stripe: Stripe, db: SupabaseClient, sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.source !== STRIPE_SOURCE || session.mode !== 'payment' || session.payment_status !== 'paid') return null;
  const ownerId = session.client_reference_id;
  if (!ownerId || session.currency !== 'usd') throw new Error('Invalid checkout owner/currency');
  const rows: { productId: string; title: string; variant?: string; quantity: number; unitPrice: number; image: string }[] = [];
  for await (const line of stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ['data.price.product'] })) {
    const product = line.price?.product;
    if (!product || typeof product === 'string' || !('metadata' in product) || !product.metadata.product_id
      || !line.quantity || line.price?.unit_amount == null || line.currency !== 'usd') throw new Error('Invalid Stripe order line');
    rows.push({ productId: product.metadata.product_id, title: product.name,
      variant: product.metadata.variant_name || undefined, quantity: line.quantity,
      unitPrice: line.price.unit_amount / 100, image: product.images?.[0] || '' });
  }
  const total = rows.reduce((sum, row) => sum + Math.round(row.unitPrice * 100) * row.quantity, 0);
  if (!rows.length || total !== session.amount_total) throw new Error('Stripe total does not match order');
  const { error } = await db.from('chat_sessions').upsert({
    id: session.id, owner_id: ownerId,
    customer_name: session.customer_details?.name || session.metadata.roblox_username || 'Cliente Stripe',
    contact_email: session.customer_details?.email || session.customer_email,
    roblox_username: session.metadata.roblox_username,
    payment_method: 'Stripe (USD)', payment_status: 'verified', status: 'open',
    total_amount: total / 100, cart_items: rows, proof_image: '',
    delivery_status: 'pending', verified_at: new Date().toISOString(), last_message_at: Date.now(),
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new Error('Could not persist Stripe order');
  const { data: stored, error: readError } = await db.from('chat_sessions')
    .select('owner_id,payment_status,total_amount,payment_method').eq('id', session.id).single();
  if (readError || !stored || stored.owner_id !== ownerId || stored.payment_status !== 'verified'
    || Number(stored.total_amount) !== total / 100 || stored.payment_method !== 'Stripe (USD)') throw new Error('Stripe order conflict');
  return session.id;
}
