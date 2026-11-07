import type Stripe from 'stripe';
import { handlePaymentError, paymentServices, recordPaidSession, STRIPE_SOURCE } from '../../server/stripe.js';

export const config = { runtime: 'nodejs', api: { bodyParser: false } };
export async function rawWebhookBody(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  // Vercel's Node runtime restores the raw stream and defines req.body as a
  // lazy JSON getter. Read data/end BEFORE touching that getter.
  if (typeof req.on === 'function') {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > 1048576) { reject(new Error('Payload too large')); return; }
        chunks.push(bytes);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') throw new Error('Raw body required');
  throw new Error('Raw body required');
}
export function createWebhookHandler(services = paymentServices) {
  return async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
      const { stripe, db } = services();
      let event: Stripe.Event;
      try {
        const signature = req.headers['stripe-signature'];
        if (typeof signature !== 'string') throw new Error('Missing signature');
        event = stripe.webhooks.constructEvent(await rawWebhookBody(req), signature, process.env.STRIPE_WEBHOOK_SECRET!);
      } catch { return res.status(400).json({ error: 'Invalid webhook signature or body' }); }
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.source === STRIPE_SOURCE) await recordPaidSession(stripe, db, session.id);
      } else if (event.type === 'checkout.session.async_payment_failed') {
        // Failed payments never create orders. The status endpoint reads the latest
        // PaymentIntent state so customers can retry without claiming payment.
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.source === STRIPE_SOURCE) console.info('Stripe asynchronous payment failed:', session.id);
      }
      return res.status(200).json({ received: true });
    } catch (error) { return handlePaymentError(res, error); }
  }
}
export default createWebhookHandler();
