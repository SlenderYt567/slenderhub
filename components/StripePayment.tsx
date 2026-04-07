import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { Loader2, CreditCard, Check } from 'lucide-react';

const stripePromise = loadStripe(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    'pk_test_51TJj6qCjDcke6TeukhTm44DsmO5rMiDjVKcB4p8PSi9nRlrnfTwdGWAjByTYGEWr3sKKLKl4VL25plOQHbmiSybY00FPqFPnDw'
);

interface StripeCheckoutFormProps {
    onSuccess: () => void;
    onError: (msg: string) => void;
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({ onSuccess, onError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [succeeded, setSucceeded] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);
        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: window.location.origin },
                redirect: 'if_required'
            });

            if (error) {
                onError(error.message || 'Payment failed. Please try again.');
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                setSucceeded(true);
                onSuccess();
            }
        } catch (err: any) {
            onError(err?.message || 'Unexpected error. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    if (succeeded) {
        return (
            <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                    <Check className="h-7 w-7" />
                </div>
                <p className="font-bold text-white">Payment confirmed!</p>
                <p className="text-sm text-gray-400">Creating your order...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement
                options={{
                    layout: 'tabs',
                    appearance: {
                        theme: 'night',
                        variables: {
                            colorPrimary: '#3b82f6',
                            colorBackground: '#020617',
                            colorText: '#f8fafc',
                            colorDanger: '#ef4444',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            borderRadius: '8px',
                        }
                    }
                }}
            />
            <button
                type="submit"
                disabled={!stripe || processing}
                className="mt-5 w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {processing
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                    : <><CreditCard className="h-5 w-5" /> Pay Now</>
                }
            </button>
        </form>
    );
};

interface StripePaymentProps {
    amount: number;
    customerEmail: string;
    customerName: string;
    onSuccess: () => void;
    onError: (msg: string) => void;
}

const StripePayment: React.FC<StripePaymentProps> = ({
    amount, customerEmail, customerName, onSuccess, onError
}) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loadingIntent, setLoadingIntent] = useState(false);
    const [intentError, setIntentError] = useState<string | null>(null);

    const createIntent = async () => {
        setLoadingIntent(true);
        setIntentError(null);
        try {
            const res = await fetch('/api/stripe-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, currency: 'usd', customerEmail })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setClientSecret(data.clientSecret);
        } catch (err: any) {
            setIntentError(err.message || 'Failed to initialize payment.');
        } finally {
            setLoadingIntent(false);
        }
    };

    if (loadingIntent) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        );
    }

    if (intentError) {
        return (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
                <p className="text-sm text-red-400 mb-3">{intentError}</p>
                <button
                    onClick={createIntent}
                    className="text-xs text-blue-400 underline hover:text-blue-300"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-4">
                    Click below to securely enter your card details.<br />
                    <span className="text-xs text-gray-500">Powered by Stripe — your card info is never stored on our servers.</span>
                </p>
                <button
                    onClick={createIntent}
                    className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-500"
                >
                    <CreditCard className="h-5 w-5" />
                    Enter Card Details — ${amount.toFixed(2)} USD
                </button>
            </div>
        );
    }

    return (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <StripeCheckoutForm onSuccess={onSuccess} onError={onError} />
        </Elements>
    );
};

export default StripePayment;
