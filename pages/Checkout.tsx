import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { ArrowLeft, Check, Copy, Loader2, MessageSquare, Upload, FileCheck, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Checkout: React.FC = () => {
    const { cart, totalCartValue, clearCart, createChat, isAuthenticated, user } = useStore();
    const navigate = useNavigate();
    const [step, setStep] = useState<'review' | 'payment' | 'success'>('review');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    // Removed explicit customerName input state, utilizing "Customer" default
    const [proofFile, setProofFile] = useState<string | null>(null);
    const [createdChatId, setCreatedChatId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'international'>('pix');

    // Specific Pix Key
    const pixCode = "c8e4e850-c45d-4660-a2f1-44d8cf3aaf0f";
    const pixBeneficiary = "PEDRO HENRIQUE COSTA BELFORT";

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
            reader.onloadend = () => {
                setProofFile(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFinish = () => {
        if (!proofFile && paymentMethod === 'pix') {
            alert("Please upload the payment proof to continue.");
            return;
        }
        // Use user's email/name if available
        const customerName = user?.email?.split('@')[0] || "Customer";
        const chatId = createChat(customerName, proofFile || '', totalCartValue);
        setCreatedChatId(chatId);
        clearCart();
        setStep('success');
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
                        : "Please proceed to our support chat or Discord to finalize your international payment."}
                </p>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                        onClick={handleOpenChat}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition"
                    >
                        <MessageSquare className="h-5 w-5" />
                        Open Support Chat
                    </button>
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
                                <span className="font-medium text-white">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="border-t border-slate-800 pt-4">
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-white">Total</span>
                                <span className="text-blue-400">${totalCartValue.toFixed(2)}</span>
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
                                            <span className="text-xs text-gray-400">Instant Approval</span>
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
                                            <span className="block font-bold text-white">International (USD/EUR)</span>
                                            <span className="text-xs text-gray-400">PayPal / Crypto via Discord</span>
                                        </div>
                                    </div>
                                    <div className={`h-4 w-4 rounded-full border-[3px] ${paymentMethod === 'international' ? 'border-indigo-500' : 'border-slate-600'}`}></div>
                                </button>
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

                                    <div className="mb-4">
                                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Pix Beneficiary</label>
                                        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm font-bold text-white text-center">
                                            {pixBeneficiary}
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
                                        disabled={!proofFile}
                                        className="w-full rounded-xl bg-green-600 py-4 font-bold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Confirm & Send Proof
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="mb-6 rounded-full bg-indigo-500/10 p-6 text-indigo-500">
                                            <Globe className="h-16 w-16" />
                                        </div>
                                        <h2 className="mb-4 text-2xl font-bold text-white">International Payment</h2>
                                        <p className="mb-8 max-w-md text-gray-400">
                                            To pay with USD, Euro, or Crypto, please join our Discord server or click "Create Order" below to chat with an admin.
                                        </p>

                                        <a
                                            href="https://discord.gg/E3xsUmtx"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mb-4 w-full rounded-xl bg-[#5865F2] py-4 font-bold text-white transition hover:bg-[#4752C4]"
                                        >
                                            Join Discord Server
                                        </a>

                                        <button
                                            onClick={handleFinish}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-4 font-bold text-white transition hover:bg-slate-800"
                                        >
                                            Create Order & Chat with Admin
                                        </button>
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
