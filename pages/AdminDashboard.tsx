import React, { useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, ArrowRight, User, CheckCircle, XCircle, DollarSign, Image as ImageIcon } from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const { chats, isAdmin, verifyPayment, closeChat } = useStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAdmin) {
            navigate('/login');
        }
    }, [isAdmin, navigate]);

    // pending_payment implies they uploaded proof but it hasn't been verified
    const pendingPayments = chats.filter(c => c.status === 'pending_payment');
    const activeChats = chats.filter(c => c.status === 'open');
    const closedChats = chats.filter(c => c.status === 'closed');

    const handleVerify = (chatId: string) => {
        // Direct action without confirm dialog for better UX
        verifyPayment(chatId);
    };

    const handleReject = (chatId: string) => {
        // Direct action without confirm dialog
        closeChat(chatId);
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Support Dashboard</h1>
                <p className="text-gray-400">Manage payment verifications and active conversations.</p>
            </div>

            {/* Pending Payments Section */}
            <div className="mb-12">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                    </span>
                    Pending Payments ({pendingPayments.length})
                </h2>

                {pendingPayments.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center mb-8">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-gray-500">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <p className="text-gray-500">No pending payments to verify.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
                        {pendingPayments.map(chat => (
                            <div key={chat.id} className="group relative overflow-hidden rounded-xl border border-yellow-500/30 bg-slate-900 p-0 transition hover:border-yellow-500">
                                {/* Proof Preview */}
                                <div className="h-40 w-full overflow-hidden bg-black/50">
                                    {chat.proofImage ? (
                                        <img src={chat.proofImage} alt="Proof" className="h-full w-full object-cover opacity-80 hover:opacity-100 transition" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-gray-500">
                                            <ImageIcon className="h-8 w-8" />
                                            <span className="ml-2">No Image</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-white">{chat.customerName}</h3>
                                            <p className="text-xs text-gray-500">Total: <span className="text-green-400 font-bold">${chat.totalAmount?.toFixed(2)}</span></p>
                                        </div>
                                        <span className="rounded bg-yellow-500/10 px-2 py-1 text-xs font-bold uppercase text-yellow-500">Verifying</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleVerify(chat.id)}
                                            className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-500"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(chat.id)}
                                            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-500"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/chat/${chat.id}`)}
                                        className="mt-3 w-full text-xs text-gray-500 hover:text-white"
                                    >
                                        Inspect Chat & Proof
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Chats Section */}
            <div className="mb-12">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Active Tickets ({activeChats.length})
                </h2>

                {activeChats.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                        <p className="text-gray-500">No active support tickets.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeChats.map(chat => (
                            <div key={chat.id} className="group relative rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500/50 hover:bg-slate-800">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">{chat.customerName}</h3>
                                            <p className="text-xs text-gray-500">ID: {chat.id.slice(-6)}</p>
                                        </div>
                                    </div>
                                    <span className="rounded bg-green-500/10 px-2 py-1 text-xs font-bold uppercase text-green-500">Paid</span>
                                </div>

                                <div className="mb-6 flex items-center gap-2 text-xs text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    <span>Last activity: {new Date(chat.lastMessageAt).toLocaleTimeString()}</span>
                                </div>

                                <button
                                    onClick={() => navigate(`/chat/${chat.id}`)}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
                                >
                                    Open Chat <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="mb-4 text-xl font-bold text-gray-500">Closed History</h2>
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-slate-950 text-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-medium">Customer</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {closedChats.map(chat => (
                                <tr key={chat.id} className="hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium text-white">{chat.customerName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${chat.paymentStatus === 'verified' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {chat.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{new Date(chat.lastMessageAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => navigate(`/chat/${chat.id}`)} className="text-blue-500 hover:text-blue-400">View Transcript</button>
                                    </td>
                                </tr>
                            ))}
                            {closedChats.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No closed tickets found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
