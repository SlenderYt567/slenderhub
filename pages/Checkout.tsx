import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { ArrowLeft, Check, Copy, Loader2, MessageSquare, Upload, FileCheck, Globe, HelpCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';

// Compresses a base64 image to max 800px and quality 70% to avoid Supabase payload limits
const compressImage = (base64: string, maxSize = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
                if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
                else { width = Math.round(width * maxSize / height); height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64); // fallback: use original if error
        img.src = base64;
    });
};

const Checkout: React.FC = () => {
    const { cart, totalCartValue, clearCart, createChat, isAuthenticated, user, formatPrice, exchangeRate, currency } = useStore();
    const navigate = useNavigate();
    const [{ isPending: paypalLoading }] = usePayPalScriptReducer();
    const [step, setStep] = useState<'review' | 'payment' | 'success'>('review');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [proofFile, setProofFile] = useState<string | null>(null);
    const [createdChatId, setCreatedChatId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'international'>('pix');
    const [contactEmail, setContactEmail] = useState(user?.email || '');
    const [emailError, setEmailError] = useState(false);

    // Specific Pix Key
    const pixCode = "c8e4e850-c45d-4660-a2f1-44d8cf3aaf0f";

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const handlePay = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setStep('payment');
        }, 1000);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const raw = reader.result as string;
                const compressed = await compressImage(raw);
                setProofFile(compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFinish = async () => {
        if (!proofFile && paymentMethod === 'pix') {
            alert("Please upload the payment proof to continue.");
            return;
        }

        if (paymentMethod === 'pix' && (!contactEmail || !contactEmail.includes('@'))) {
            setEmailError(true);
            alert("Por favor insira um e-mail válido para entrega.");
            return;
        }

        setSubmitting(true);

        // Use user's email/name if available
        const baseName = user?.email?.split('@')[0] || "Customer";
        const emailToDisplay = contactEmail || user?.email || "";
        const customerNameAndEmail = emailToDisplay ? `${baseName} (${emailToDisplay})` : baseName;

        // Fire email notification with 8s timeout — non-blocking, never stalls the checkout
        const emailController = new AbortController();
        const emailTimeout = setTimeout(() => emailController.abort(), 8000);
        fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: emailController.signal,
            body: JSON.stringify({
                contactEmail: emailToDisplay,
                customerName: customerNameAndEmail,
                totalValue: totalCartValue,
                items: cart,
                method: paymentMethod
            })
        }).catch(err => console.warn("Email API not available:", err))
          .finally(() => clearTimeout(emailTimeout));

        try {
            const chatId = await createChat(customerNameAndEmail, proofFile || '', totalCartValue);
            setCreatedChatId(chatId);
            clearCart();
            setStep('success');
        } catch (error: any) {
            console.error("Failed handling checkout:", error);
            alert("Erro ao criar pedido: " + (error?.message || "Tente novamente."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenChat = () => {
        if (createdChatId) {
            navigate(`/chat/${createdChatId}`);
        } else {
            navigate('/');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (step === 'success') {
        return (
            <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-500 ring-1 ring-green-500/20">
                    <Check className="h-10 w-10" />
                </div>
                <h1 className="mb-2 text-3xl font-bold text-white">
                    {paymentMethod === 'pix' ? 'Proof Received!' : 'Order Created!'}
                </h1>
                <p className="mb-8 max-w-md text-gray-400">
                    {paymentMethod === 'pix'
                        ? "We have received your payment proof. An admin will verify it shortly."
                        : "Payment confirmed! Check your email or open the support chat below."}
                </p>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                        onClick={handleOpenChat}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition"
                    >
                        <MessageSquare className="h-5 w-5" />
                        Open Support Chat
                    </button>
                    <a
                        href="https://discord.gg/2B8TQ7A3MV"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-8 py-3.5 font-bold text-indigo-400 hover:bg-indigo-500/20 transition"
                    >
                        <Globe className="h-5 w-5" />
                        Join Our Discord
                    </a>
                    <Link to="/" className="rounded-xl border border-slate-700 bg-slate-900 px-8 py-3.5 font-bold text-white hover:bg-slate-800 transition">
                        Back to Store
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <Link to="/cart" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
                <ArrowLeft className="h-4 w-4" />
                Back to Cart
            </Link>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Order Details */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <h2 className="mb-6 text-xl font-bold text-white">Order Summary</h2>
                    <div className="space-y-4">
                        {cart.map(item => (
                            <div key={item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id} className="flex justify-between text-sm">
                                <div className="flex flex-col">
                                    <span className="text-gray-300">
                                        {item.title}
                                        <span className="text-gray-500 ml-1">x{item.quantity}</span>
                                    </span>
                                    {item.selectedVariant && (
                                        <span className="text-xs text-blue-400">{item.selectedVariant.name}</span>
                                    )}
                                </div>
                                <span className="font-medium text-white">
                                    {formatPrice(item.price * item.quantity)}
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-slate-800 pt-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-lg font-bold">
                                    <span className="text-white">Total</span>
                                    <span className="text-blue-400">{formatPrice(totalCartValue)}</span>
                                </div>
                                {currency === 'USD' && (
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Approx. BRL</span>
                                        <span>R$ {(totalCartValue * exchangeRate).toFixed(2)}</span>
                                    </div>
                                )}
                                {currency === 'BRL' && (
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Value in USD</span>
                                        <span>${totalCartValue.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Section */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    {step === 'review' ? (
                        <>
                            <h2 className="mb-6 text-xl font-bold text-white">Payment Method</h2>
                            <div className="space-y-4">
                                <button
                                    onClick={() => setPaymentMethod('pix')}
                                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${paymentMethod === 'pix' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-12 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold">PIX</div>
                                        <div>
                                            <span className="block font-bold text-white">Pay with Pix (Brazil)</span>
                                            <span className="text-xs text-gray-400">Total: R$ {(totalCartValue * exchangeRate).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className={`h-4 w-4 rounded-full border-[3px] ${paymentMethod === 'pix' ? 'border-blue-500' : 'border-slate-600'}`}></div>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('international')}
                                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${paymentMethod === 'international' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-12 rounded bg-white/10 flex items-center justify-center">
                                            <Globe className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="block font-bold text-white">International (PayPal)</span>
                                            <span className="text-xs text-gray-400">Total: ${totalCartValue.toFixed(2)} USD</span>
                                        </div>
                                    </div>
                                    <div className={`h-4 w-4 rounded-full border-[3px] ${paymentMethod === 'international' ? 'border-indigo-500' : 'border-slate-600'}`}></div>
                                </button>
                                
                                <div className="mt-4 rounded-xl bg-slate-900/50 p-4 border border-slate-800">
                                    <div className="flex items-start gap-3">
                                        <HelpCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-gray-300">Need help with payment?</p>
                                            <p className="text-[10px] text-gray-500 mt-1">Contact us on Discord for support or manual payment methods.</p>
                                            <a 
                                                href="https://discord.gg/2B8TQ7A3MV" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-400 hover:underline mt-1 inline-block"
                                            >
                                                Open Discord Support
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handlePay}
                                disabled={loading || cart.length === 0}
                                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
                            </button>
                        </>
                    ) : (
                        <>
                            {paymentMethod === 'pix' ? (
                                <>
                                    <h2 className="mb-2 text-xl font-bold text-white">Scan to Pay</h2>
                                    <p className="mb-6 text-sm text-gray-400">Open your banking app and scan the QR code or copy the Pix key below.</p>

                                    <div className="mb-6 flex justify-center">
                                        <div className="rounded-xl bg-white p-4">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`}
                                                alt="Pix QR Code"
                                                className="h-48 w-48"
                                            />
                                        </div>
                                    </div>



                                    <div className="mb-6">
                                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Pix Copy and Paste</label>
                                        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={pixCode}
                                                className="flex-1 bg-transparent text-xs text-gray-400 focus:outline-none"
                                            />
                                            <button
                                                onClick={copyToClipboard}
                                                className="rounded p-2 text-blue-500 hover:bg-blue-500/10"
                                                title="Copy"
                                            >
                                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Contact Email (For Delivery) *</label>
                                        <input
                                            type="email"
                                            value={contactEmail}
                                            onChange={(e) => {
                                                setContactEmail(e.target.value);
                                                if (emailError) setEmailError(false);
                                            }}
                                            placeholder="youremail@example.com"
                                            className={`w-full rounded-lg border bg-slate-950 p-3 text-sm text-white focus:outline-none focus:ring-2 ${emailError ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/50'}`}
                                        />
                                        {emailError && <p className="mt-1 text-xs text-red-500">Please provide a valid email.</p>}
                                    </div>

                                    <div className="mb-6 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
                                        <label className="mb-2 block text-sm font-bold text-white">Attach Proof of Payment</label>
                                        <p className="mb-4 text-xs text-gray-400">Please upload a screenshot of your Pix transaction.</p>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            id="proof-upload"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />

                                        {!proofFile ? (
                                            <label htmlFor="proof-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-blue-400 hover:bg-slate-700 hover:text-white transition">
                                                <Upload className="h-4 w-4" />
                                                Select File
                                            </label>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-2 text-green-500 font-bold mb-2">
                                                    <FileCheck className="h-5 w-5" />
                                                    File Attached
                                                </div>
                                                <label htmlFor="proof-upload" className="text-xs text-gray-500 hover:text-white cursor-pointer underline">Change File</label>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleFinish}
                                        disabled={!proofFile || submitting}
                                        className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm & Send Proof'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col py-4">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="rounded-full bg-blue-500/10 p-3 text-blue-400">
                                                <Globe className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-white">Pay with PayPal</h2>
                                                <p className="text-xs text-gray-400">Secure payment — accepts cards, PayPal balance & more</p>
                                            </div>
                                        </div>

                                        {/* Order summary before PayPal */}
                                        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
                                            {cart.map(item => (
                                                <div key={item.id} className="flex justify-between py-1 text-gray-300">
                                                    <span>{item.title} {item.selectedVariant ? `— ${item.selectedVariant.name}` : ''} <span className="text-gray-500">x{item.quantity}</span></span>
                                                    <span>{formatPrice(item.price * item.quantity)}</span>
                                                </div>
                                            ))}
                                            <div className="mt-3 border-t border-slate-700 pt-3 flex flex-col gap-1 font-bold text-white">
                                                <div className="flex justify-between">
                                                    <span>Total</span>
                                                    <span className="text-blue-400">${totalCartValue.toFixed(2)} USD</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>BRL Equivalent</span>
                                                    <span>R$ {(totalCartValue * exchangeRate).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact email for PayPal */}
                                        <div className="mb-4">
                                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Your Email (for order confirmation)</label>
                                            <input
                                                type="email"
                                                value={contactEmail}
                                                onChange={(e) => setContactEmail(e.target.value)}
                                                placeholder="youremail@example.com"
                                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/50"
                                            />
                                        </div>

                                        {/* PayPal Buttons */}
                                        {paypalLoading ? (
                                            <div className="flex justify-center py-6">
                                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                            </div>
                                        ) : (
                                            <PayPalButtons
                                                style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                                                disabled={cart.length === 0}
                                                createOrder={(_data, actions) => {
                                                    return actions.order.create({
                                                        intent: 'CAPTURE',
                                                        purchase_units: [{
                                                            amount: {
                                                                currency_code: 'USD',
                                                                value: totalCartValue.toFixed(2),
                                                                breakdown: {
                                                                    item_total: {
                                                                        currency_code: 'USD',
                                                                        value: totalCartValue.toFixed(2)
                                                                    }
                                                                }
                                                            },
                                                            items: cart.map(item => ({
                                                                name: item.title + (item.selectedVariant ? ` - ${item.selectedVariant.name}` : ''),
                                                                unit_amount: {
                                                                    currency_code: 'USD',
                                                                    value: item.price.toFixed(2)
                                                                },
                                                                quantity: String(item.quantity)
                                                            }))
                                                        }]
                                                    });
                                                }}
                                                onApprove={async (_data, actions) => {
                                                    setSubmitting(true);
                                                    try {
                                                        const details = await actions.order!.capture();
                                                        const payerEmail = details.payer?.email_address || contactEmail || 'paypal-customer';
                                                        const payerName = details.payer?.name?.given_name || user?.email?.split('@')[0] || 'Customer';
                                                        const customerLabel = `${payerName} (${payerEmail}) — PayPal`;
                                                        const orderId = details.id || '';
                                                        const chatId = await createChat(customerLabel, `PayPal Order ID: ${orderId}`, totalCartValue);
                                                        clearCart();
                                                        setCreatedChatId(chatId);
                                                        setStep('success');
                                                    } catch (err: any) {
                                                        console.error('PayPal capture error', err);
                                                        alert('Erro ao processar pagamento: ' + (err?.message || 'Tente novamente.'));
                                                    } finally {
                                                        setSubmitting(false);
                                                    }
                                                }}
                                                onError={(err) => {
                                                    console.error('PayPal error', err);
                                                    alert('Erro no PayPal. Tente novamente ou use outro método.');
                                                }}
                                            />
                                        )}

                                        <div className="mt-4 border-t border-slate-800 pt-4 text-center">
                                            <p className="text-xs text-gray-500 mb-2">Prefer other options?</p>
                                            <a
                                                href="https://discord.gg/2B8TQ7A3MV"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition"
                                            >
                                                <Globe className="h-3 w-3" /> Pay with Crypto via Discord
                                            </a>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Checkout;
