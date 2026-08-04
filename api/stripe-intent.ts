import Stripe from 'stripe';

export const config = {
    runtime: 'nodejs',
};

// Assinatura Express-style (req, res): o @vercel/node (Vercel 58+) não despacha
// handlers Web API (request: Request) — penduravam com 0 bytes no runtime.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
        const { amount, currency = 'usd', customerEmail } = req.body || {};

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const stripe = new Stripe(stripeSecretKey);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe uses cents
            currency,
            automatic_payment_methods: { enabled: true },
            metadata: {
                customer_email: customerEmail || '',
                source: 'slenderhub'
            }
        });

        return res.status(200).json({ clientSecret: paymentIntent.client_secret });

    } catch (error: any) {
        console.error('Stripe intent error:', error);
        return res.status(500).json({ error: error.message || 'Internal error' });
    }
}
