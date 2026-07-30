import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, ArrowRight, User, CheckCircle, XCircle, DollarSign, Image as ImageIcon, Key, Plus, RefreshCw, Layers, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AdminDashboard: React.FC = () => {
    const { chats, isAdmin, products, verifyPayment, closeChat, showToast } = useStore();
    const navigate = useNavigate();
    const [deliveringKeyId, setDeliveringKeyId] = useState<string | null>(null);
    const [deliveryFeedback, setDeliveryFeedback] = useState<{ [key: string]: string }>({});

    // Key Management State
    const [selectedProductId, setSelectedProductId] = useState<string>('default-product');
    const [newKeysText, setNewKeysText] = useState<string>('');
    const [stockList, setStockList] = useState<any[]>([]);
    const [loadingStock, setLoadingStock] = useState<boolean>(false);
    const [addKeyMessage, setAddKeyMessage] = useState<string | null>(null);
    const [keySearchQuery, setKeySearchQuery] = useState<string>('');
    const [keyFilterStatus, setKeyFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'DELIVERED'>('ALL');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/login');
        } else {
            fetchStockList();
        }
    }, [isAdmin, navigate]);

    const fetchStockList = async () => {
        setLoadingStock(true);
        try {
            const { data, error } = await supabase
                .from('digital_keys')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setStockList(data);
            }
        } catch (e) {
            console.error("Erro ao carregar estoque:", e);
        } finally {
            setLoadingStock(false);
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        try {
            const { error } = await supabase
                .from('digital_keys')
                .delete()
                .eq('id', keyId);

            if (!error) {
                showToast('Key removida do estoque!', 'success');
                setStockList(prev => prev.filter(k => k.id !== keyId));
            } else {
                showToast(`Erro ao deletar: ${error.message}`, 'error');
            }
        } catch (err: any) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    };

    const filteredStockList = stockList.filter(item => {
        const matchesStatus = keyFilterStatus === 'ALL' || item.status === keyFilterStatus;
        const matchesQuery = !keySearchQuery || 
            (item.content && item.content.toLowerCase().includes(keySearchQuery.toLowerCase())) ||
            (item.assigned_to_email && item.assigned_to_email.toLowerCase().includes(keySearchQuery.toLowerCase())) ||
            (item.product_id && item.product_id.toLowerCase().includes(keySearchQuery.toLowerCase()));

        return matchesStatus && matchesQuery;
    });


    const handleAddKeysToStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeysText.trim()) return;

        const lines = newKeysText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) return;

        setAddKeyMessage('Salvando keys no estoque...');

        const rowsToInsert = lines.map(content => ({
            product_id: selectedProductId,
            content: content,
            status: 'AVAILABLE'
        }));

        try {
            const { data, error } = await supabase
                .from('digital_keys')
                .insert(rowsToInsert)
                .select();

            if (error) {
                setAddKeyMessage(`❌ Erro ao salvar: ${error.message}`);
            } else {
                setAddKeyMessage(`✅ ${lines.length} key(s) adicionada(s) com sucesso ao produto "${selectedProductId}"!`);
                setNewKeysText('');
                fetchStockList();
            }
        } catch (err: any) {
            setAddKeyMessage(`❌ Erro: ${err.message || 'Falha ao conectar com o Supabase'}`);
        }
    };


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

    const handleDeliverKeyAndApprove = async (chat: any) => {
        setDeliveringKeyId(chat.id);
        setDeliveryFeedback(prev => ({ ...prev, [chat.id]: 'Enviando Key...' }));

        const targetEmail = chat.contactEmail || chat.customerEmail || (chat.customerName && chat.customerName.includes('@') ? chat.customerName : '');

        if (!targetEmail) {
            setDeliveryFeedback(prev => ({ ...prev, [chat.id]: '❌ Nenhum email de contato disponível para este pedido.' }));
            setDeliveringKeyId(null);
            return;
        }

        try {
            const response = await fetch('/api/deliver-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: chat.id,
                    productId: chat.productId || 'default-product',
                    productTitle: chat.productTitle || 'Digital Product Slender Hub',
                    customerEmail: targetEmail,
                    customerName: chat.customerName || 'Cliente'
                })
            });

            const text = await response.text();
            let data: any = {};
            try {
                data = JSON.parse(text);
            } catch {
                data = { message: text || `Status ${response.status}` };
            }

            if (response.ok && data.success) {
                setDeliveryFeedback(prev => ({ ...prev, [chat.id]: '✅ Key Enviada com Sucesso!' }));
                verifyPayment(chat.id);
            } else {
                setDeliveryFeedback(prev => ({ ...prev, [chat.id]: `⚠️ ${data.message || data.error || 'Erro no envio'}` }));
            }
        } catch (error: any) {
            console.error("Erro ao enviar key:", error);
            setDeliveryFeedback(prev => ({ ...prev, [chat.id]: `❌ Erro: ${error.message || 'Falha de conexão'}` }));
        } finally {
            setDeliveringKeyId(null);
        }
    };


    return (
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Support & Keys Dashboard</h1>
                    <p className="text-gray-400">Gerencie pagamentos, entregas automáticas e estoque de keys digitais.</p>
                </div>
            </div>

            {/* GERENCIADOR DE ESTOQUE DE KEYS */}
            <div className="mb-12 rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-6 backdrop-blur shadow-xl">
                <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                        <Key className="h-5 w-5 text-indigo-400" />
                        Estoque de Keys & Links Digitais
                    </h2>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-400 border border-emerald-500/20">
                            Disponíveis: {stockList.filter(k => k.status === 'AVAILABLE').length}
                        </span>
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 font-bold text-blue-400 border border-blue-500/20">
                            Entregues: {stockList.filter(k => k.status === 'DELIVERED').length}
                        </span>
                        <button 
                            onClick={fetchStockList} 
                            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-gray-400 hover:text-white"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingStock ? 'animate-spin' : ''}`} /> Atualizar
                        </button>
                    </div>
                </div>

                <form onSubmit={handleAddKeysToStock} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-3">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Produto Alvo (ID)
                        </label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                            <option value="default-product">Geral / Produto Padrão (default-product)</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.title} ({p.id})</option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-500"
                        >
                            <Plus className="h-4 w-4" /> Adicionar ao Estoque
                        </button>

                        {addKeyMessage && (
                            <p className="text-xs font-medium text-indigo-300 mt-2">
                                {addKeyMessage}
                            </p>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            Keys ou Links de Acesso (Uma chave/link por linha)
                        </label>
                        <textarea
                            rows={4}
                            value={newKeysText}
                            onChange={(e) => setNewKeysText(e.target.value)}
                            placeholder="Cole aqui suas keys ou links, uma por linha:&#10;SLENDER-KEY-AAAA-1111&#10;SLENDER-KEY-BBBB-2222&#10;https://slenderhub.shop/claim?access=xyz"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-indigo-300 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                </form>

                {/* CONTROLES E TABELA DE KEYS NO ESTOQUE */}
                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                        <input
                            type="text"
                            value={keySearchQuery}
                            onChange={(e) => setKeySearchQuery(e.target.value)}
                            placeholder="Buscar por Key, Produto ID ou E-mail do cliente..."
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto text-xs">
                        <button
                            type="button"
                            onClick={() => setKeyFilterStatus('ALL')}
                            className={`px-3 py-1 rounded font-medium transition ${keyFilterStatus === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            Todas ({stockList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setKeyFilterStatus('AVAILABLE')}
                            className={`px-3 py-1 rounded font-medium transition ${keyFilterStatus === 'AVAILABLE' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            Disponíveis ({stockList.filter(k => k.status === 'AVAILABLE').length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setKeyFilterStatus('DELIVERED')}
                            className={`px-3 py-1 rounded font-medium transition ${keyFilterStatus === 'DELIVERED' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            Entregues ({stockList.filter(k => k.status === 'DELIVERED').length})
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
                    <div className="max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-xs text-gray-400">
                            <thead className="sticky top-0 bg-slate-900 text-gray-300 z-10 shadow">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold">Produto ID</th>
                                    <th className="px-4 py-2.5 font-semibold">Key / Link</th>
                                    <th className="px-4 py-2.5 font-semibold">Status</th>
                                    <th className="px-4 py-2.5 font-semibold">Entregue Para</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredStockList.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-900/50 transition">
                                        <td className="px-4 py-2.5 font-semibold text-slate-300">{item.product_id}</td>
                                        <td className="px-4 py-2.5 font-mono text-indigo-300 truncate max-w-xs select-all">{item.content}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-400 font-medium">{item.assigned_to_email || '-'}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <button
                                                onClick={() => handleDeleteKey(item.id)}
                                                className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition"
                                                title="Remover Key"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStockList.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 font-medium">
                                            {stockList.length === 0 ? 'Nenhuma key cadastrada ainda no estoque.' : 'Nenhuma key encontrada com este filtro.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleDeliverKeyAndApprove(chat)}
                                            disabled={deliveringKeyId === chat.id}
                                            className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
                                        >
                                            {deliveringKeyId === chat.id ? '🔑 Resgatando & Enviando...' : '🔑 Aprovar & Enviar Key por E-mail'}
                                        </button>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleVerify(chat.id)}
                                                className="flex-1 rounded-lg bg-green-600/80 py-2 text-xs font-bold text-white hover:bg-green-500"
                                            >
                                                Aprovar Apenas
                                            </button>
                                            <button
                                                onClick={() => handleReject(chat.id)}
                                                className="flex-1 rounded-lg bg-red-600/80 py-2 text-xs font-bold text-white hover:bg-red-500"
                                            >
                                                Rejeitar
                                            </button>
                                        </div>

                                        {deliveryFeedback[chat.id] && (
                                            <p className="mt-1 text-center text-xs font-semibold text-indigo-400">
                                                {deliveryFeedback[chat.id]}
                                            </p>
                                        )}
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
