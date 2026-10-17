import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, Key, Users, Tag, Share2,
  MessageSquare, BarChart3, Settings, Search, CheckCircle2, Clock,
  Truck, XCircle, ArrowUpRight, Copy, Check, ExternalLink, Calendar,
  ChevronDown, Eye, Filter, RefreshCw, Trash2, Plus, ShieldCheck,
  Gamepad2, AlertCircle, X, Image as ImageIcon, Flame
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
  getStoredGames, loadGames, saveGame, deleteStoredGame,
  getStoredCategories, loadCategories, saveCategory, deleteStoredCategory, subscribeAdminStore,
} from '../lib/adminStore';
import { fetchDashboardOrders, updateDashboardDelivery, calculateDashboardMetrics } from '../lib/dashboardData';
import { uploadStoreImage } from '../lib/storeMedia';
import { Order, RobloxGame, ProductCategory } from '../types';

type AdminTab = 'dashboard' | 'delivery' | 'games' | 'categories' | 'keys';

const AdminDashboard: React.FC = () => {
  const { isAdmin, authReady, showToast, formatPrice, currency, exchangeRate, products, verifyPayment } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State
  const requestedTab = searchParams.get('tab');
  const initialTab: AdminTab = requestedTab && ['dashboard', 'delivery', 'games', 'categories', 'keys'].includes(requestedTab)
    ? requestedTab as AdminTab : 'dashboard';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'delivery', 'games', 'categories', 'keys'].includes(tab)) {
      setActiveTab(tab as AdminTab);
    }
  }, [searchParams]);

  // Synchronize tab with query param
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Orders State (Reactive from adminStore)
  const [orders, setOrders] = useState<Order[]>([]);
  const [periodDays, setPeriodDays] = useState(365);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const metrics = useMemo(() => calculateDashboardMetrics(orders, exchangeRate, periodDays), [orders, exchangeRate, periodDays]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [copiedRoblox, setCopiedRoblox] = useState(false);

  // Games & Categories State
  const [games, setGames] = useState<RobloxGame[]>(getStoredGames());
  const [categories, setCategories] = useState<ProductCategory[]>(getStoredCategories());

  // Modals State
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);

  // New Game Form
  const [newGameForm, setNewGameForm] = useState({
    name: '',
    thumb: '',
    description: '',
  });
  const [newGameFile, setNewGameFile] = useState<File | null>(null);
  const [editingGame, setEditingGame] = useState<RobloxGame | null>(null);

  // New Category Form
  const [newCategoryName, setNewCategoryName] = useState('');

  // Key stock state (Preserved as requested)
  const [stockList, setStockList] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('default-product');
  const [newKeysText, setNewKeysText] = useState<string>('');

  const refreshOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const fresh = await fetchDashboardOrders();
      setOrders(fresh);
      setSelectedOrder(previous => fresh.find(order => order.id === previous?.id) || fresh[0] || null);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Não foi possível carregar os pedidos reais.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Games/categories are shared with the public storefront.
  useEffect(() => {
    const unsubscribe = subscribeAdminStore(() => {
      setGames(getStoredGames());
      setCategories(getStoredCategories());
    });
    return unsubscribe;
  }, []);

  // Auth / stock loading
  useEffect(() => {
    if (authReady && isAdmin) {
      fetchStockList();
      void refreshOrders();
      void Promise.all([loadGames(), loadCategories()]).catch(error => {
        showToast(error instanceof Error ? error.message : 'Falha ao carregar jogos e categorias.', 'error');
      });
    }
  }, [isAdmin, authReady, refreshOrders]);

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
      console.error('Erro ao carregar estoque:', e);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleCopyRoblox = (username: string) => {
    navigator.clipboard.writeText(username);
    setCopiedRoblox(true);
    showToast(`Usuário Roblox "${username}" copiado!`, 'success');
    setTimeout(() => setCopiedRoblox(false), 2000);
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      const current = orders.find(order => order.id === orderId);
      if (!current) throw new Error('Pedido não encontrado.');
      if ((newStatus === 'Em entrega' || newStatus === 'Entregue') && current.paymentStatus !== 'Confirmado') {
        throw new Error('Verifique o pagamento antes de iniciar a entrega.');
      }
      if (newStatus === 'Em aprovação') await verifyPayment(orderId);
      else if (newStatus === 'Em entrega') await updateDashboardDelivery(orderId, 'delivering');
      else if (newStatus === 'Entregue') await updateDashboardDelivery(orderId, 'delivered');
      else if (newStatus === 'Cancelado') await updateDashboardDelivery(orderId, 'cancelled');
      await refreshOrders();
      showToast(`Status do pedido atualizado para: ${newStatus}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.', 'error');
    }
  };

  const handleCreateGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameForm.name.trim()) {
      showToast('Informe o nome do jogo.', 'error');
      return;
    }
    if (!editingGame && !newGameFile) {
      showToast('Selecione uma imagem do seu computador para o novo jogo.', 'error');
      return;
    }
    try {
      const thumb = newGameFile ? await uploadStoreImage(newGameFile, 'games') : newGameForm.thumb;
      await saveGame({ id: editingGame?.id, name: newGameForm.name.trim(), thumb, description: newGameForm.description });
      setNewGameForm({ name: '', thumb: '', description: '' });
      setNewGameFile(null);
      setEditingGame(null);
      setShowNewGameModal(false);
      showToast('Jogo salvo para todos os visitantes.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar o jogo.', 'error');
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Informe o nome da categoria.', 'error');
      return;
    }
    try {
      await saveCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      setShowNewCategoryModal(false);
      showToast('Categoria salva para todos os visitantes.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar a categoria.', 'error');
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = orderFilterStatus === 'ALL' || ord.status === orderFilterStatus;
    const query = orderSearchQuery.toLowerCase().trim();
    const matchesQuery = !query ||
      ord.orderNumber.toLowerCase().includes(query) ||
      ord.customerName.toLowerCase().includes(query) ||
      ord.robloxUsername.toLowerCase().includes(query) ||
      ord.productName.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
            <Clock className="h-3 w-3" /> Pendente
          </span>
        );
      case 'Em aprovação':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-400">
            <CheckCircle2 className="h-3 w-3" /> Em aprovação
          </span>
        );
      case 'Em entrega':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-bold text-purple-400">
            <Truck className="h-3 w-3" /> Em entrega
          </span>
        );
      case 'Entregue':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            <Check className="h-3 w-3" /> Entregue
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
            <XCircle className="h-3 w-3" /> Cancelado
          </span>
        );
    }
  };

  // Safe percentage helper for donut chart
  const totalOrd = Math.max(1, metrics.totalOrders);
  const strokePending = (metrics.pendingOrders / totalOrd) * 238;
  const strokeApproval = (metrics.approvalOrders / totalOrd) * 238;
  const strokeInDelivery = (metrics.inDeliveryOrders / totalOrd) * 238;
  const strokeDelivered = (metrics.deliveredOrders / totalOrd) * 238;
  const strokeCancelled = (metrics.cancelledOrders / totalOrd) * 238;
  const salesMax = Math.max(1, ...metrics.recentSales.map(day => day.amount));
  const salesPoints = metrics.recentSales.map((day, index) => ({
    ...day,
    x: 20 + index * 660 / Math.max(1, metrics.recentSales.length - 1),
    y: 175 - day.amount / salesMax * 145,
  }));
  const salesLine = salesPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');

  if (!authReady) return <div className="min-h-screen bg-[#070914] grid place-items-center text-purple-200">Carregando painel…</div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#070914] text-white flex">

      {/* SIDEBAR MATCHING IMAGE 1 & 2 */}
      <aside className="w-64 shrink-0 border-r border-purple-950/60 bg-[#090c1f] flex flex-col justify-between hidden md:flex">
        <div>
          {/* Sidebar Logo */}
          <div className="h-16 flex items-center px-6 border-b border-purple-950/60 gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 font-black text-white text-base shadow-md shadow-purple-600/30">
                S
              </div>
              <span className="font-extrabold text-base tracking-wider text-white">
                SLENDER<span className="text-purple-400">HUB</span>
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1 text-xs font-bold">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                activeTab === 'dashboard'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('delivery')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                activeTab === 'delivery'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-4 w-4" />
                <span>Pedidos</span>
              </div>
              <span className="rounded-full bg-red-500 text-white text-[10px] font-black px-2 py-0.5">
                {metrics.pendingOrders + metrics.approvalOrders}
              </span>
            </button>

            {/* Expanded Produtos Group */}
            <div className="pt-1 pb-1">
              <div className="flex items-center justify-between px-3.5 py-2 text-purple-300 font-extrabold bg-purple-950/30 rounded-xl border border-purple-800/30">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-purple-400" />
                  <span>Produtos</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>

              <div className="pl-9 pr-2 py-1.5 space-y-1">
                <Link to="/" className="block py-1 text-gray-400 hover:text-white transition">
                  Todos os Produtos ({products.length})
                </Link>
                <Link to="/admin" className="block py-1 text-purple-400 hover:text-purple-300 font-bold transition">
                  + Adicionar Produto
                </Link>
                <button
                  onClick={() => handleTabChange('categories')}
                  className={`block w-full text-left py-1 transition ${
                    activeTab === 'categories' ? 'text-purple-400 font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Categorias ({categories.length})
                </button>
                <button
                  onClick={() => handleTabChange('keys')}
                  className={`block w-full text-left py-1 transition ${
                    activeTab === 'keys' ? 'text-purple-400 font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Estoque de Keys
                </button>
              </div>
            </div>

            {/* Gerenciamento */}
            <div className="pt-2 pb-1 px-3 text-[10px] font-black uppercase tracking-wider text-gray-600">
              Gerenciamento
            </div>

            <button
              onClick={() => handleTabChange('games')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition ${
                activeTab === 'games'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Gamepad2 className="h-4 w-4" />
                <span>Jogos Roblox</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">{games.length}</span>
            </button>

          </nav>
        </div>

        {/* User Card at bottom */}
        <div className="p-4 border-t border-purple-950/60">
          <div className="flex items-center gap-3 rounded-2xl bg-[#0c102b] p-3 border border-purple-950">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              AD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">Admin</span>
              <span className="text-[10px] text-purple-400">Administrador</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top Header */}
        <header className="h-16 border-b border-purple-950/60 bg-[#090c1f]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-white">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'delivery' && 'Pedidos & Envio Roblox'}
              {activeTab === 'games' && 'Gerenciador de Jogos'}
              {activeTab === 'categories' && 'Gerenciador de Categorias'}
              {activeTab === 'keys' && 'Estoque de Keys Digitais'}
            </h1>
            <span className="text-xs text-gray-400 hidden sm:inline">
              {activeTab === 'dashboard' && '— Pedidos reais registrados no checkout'}
              {activeTab === 'delivery' && '— Fluxo de entrega manual dentro do Roblox'}
              {activeTab === 'games' && '— Jogos compatíveis com a loja'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            {(activeTab === 'dashboard' || activeTab === 'delivery') && (
              <button onClick={() => void refreshOrders()} disabled={ordersLoading}
                className="flex items-center gap-1.5 rounded-xl border border-purple-800 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-900/40 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            )}

            {activeTab === 'games' && (
              <button
                onClick={() => { setEditingGame(null); setNewGameFile(null); setNewGameForm({ name: '', thumb: '', description: '' }); setShowNewGameModal(true); }}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Jogo
              </button>
            )}

            {activeTab === 'categories' && (
              <button
                onClick={() => setShowNewCategoryModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Nova Categoria
              </button>
            )}

            {/* Quick Tabs Nav */}
            <div className="flex items-center bg-[#0e122b] p-1 rounded-xl border border-purple-950">
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => handleTabChange('delivery')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'delivery' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Pedidos ({orders.length})
              </button>
              <button
                onClick={() => handleTabChange('games')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'games' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Jogos
              </button>
            </div>
          </div>
        </header>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: DASHBOARD GERAL COM DADOS REAIS E INTERATIVOS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-400">Receita dos pedidos marcados como pagamento verificado pela equipe.</p>
              <select value={periodDays} onChange={e => setPeriodDays(Number(e.target.value))}
                className="rounded-xl border border-purple-900 bg-[#0e122b] px-3 py-2 text-xs font-bold text-white">
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
                <option value={365}>Últimos 12 meses</option>
              </select>
            </div>
            {ordersError && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">{ordersError}</div>}

            {/* 4 TOP STATS CARDS CALCULADOS DINAMICAMENTE */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* Pedidos */}
              <div className="rounded-2xl border border-purple-950/80 bg-[#0d1029] p-5 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedidos</span>
                    <h3 className="text-3xl font-black text-white mt-1">{metrics.totalOrders}</h3>
                    <span className="text-[11px] text-cyan-400 mt-1 block">Pedidos no período</span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600/15 text-cyan-400 border border-cyan-500/20">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Faturamento */}
              <div className="rounded-2xl border border-purple-950/80 bg-[#0d1029] p-5 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faturamento</span>
                    <h3 className="text-3xl font-black text-emerald-400 mt-1">
                      {currency === 'BRL'
                        ? `R$ ${metrics.totalRevenueBrl.toFixed(2)}`
                        : `$ ${metrics.totalRevenueUsd.toFixed(2)}`
                      }
                    </h3>
                    <span className="text-[11px] text-emerald-400/80 mt-1 block">Pagamentos verificados pela equipe</span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/15 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Pedidos pendentes */}
              <div className="rounded-2xl border border-purple-950/80 bg-[#0d1029] p-5 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedidos pendentes</span>
                    <h3 className="text-3xl font-black text-amber-400 mt-1">{metrics.pendingOrders}</h3>
                    <span className="text-[11px] text-amber-400/80 mt-1 block">Aguardando verificação</span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600/15 text-amber-400 border border-amber-500/20">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Clientes cadastrados */}
              <div className="rounded-2xl border border-purple-950/80 bg-[#0d1029] p-5 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clientes nos pedidos</span>
                    <h3 className="text-3xl font-black text-purple-400 mt-1">{metrics.uniqueCustomers}</h3>
                    <span className="text-[11px] text-purple-400/80 mt-1 block">Pessoas no período</span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/15 text-purple-400 border border-purple-500/20">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </div>

            </div>

            {/* CHARTS ROW WITH INTERACTIVE DATA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Vendas Line Chart (8 cols) */}
              <div className="lg:col-span-8 rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Vendas</h3>
                    <p className="text-xs text-gray-400">Evolução do faturamento dos pedidos</p>
                  </div>
                  <span className="text-[11px] text-gray-400">{periodDays} dias · USD</span>
                </div>

                {/* SVG Visual Line Chart */}
                <div className="relative w-full h-56 pt-4">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="purpleGradientReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    <line x1="0" y1="20" x2="700" y2="20" stroke="#1f2347" strokeDasharray="4 4" />
                    <line x1="0" y1="70" x2="700" y2="70" stroke="#1f2347" strokeDasharray="4 4" />
                    <line x1="0" y1="120" x2="700" y2="120" stroke="#1f2347" strokeDasharray="4 4" />
                    <line x1="0" y1="170" x2="700" y2="170" stroke="#1f2347" strokeDasharray="4 4" />

                    <path d={`${salesLine} L 680 190 L 20 190 Z`} fill="url(#purpleGradientReal)" />
                    <path d={salesLine} fill="none" stroke="#c084fc" strokeWidth="3.5" strokeLinecap="round" />
                    {salesPoints.filter((_, index) => index % Math.max(1, Math.floor(periodDays / 7)) === 0 || index === salesPoints.length - 1).map(point => (
                      <circle key={point.date} cx={point.x} cy={point.y} r="4" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2">
                        <title>{point.date}: ${point.amount.toFixed(2)}</title>
                      </circle>
                    ))}
                  </svg>

                  <div className="flex justify-between text-[11px] font-bold text-gray-500 mt-2 px-2">
                    {salesPoints.filter((_, index) => index % Math.max(1, Math.floor(periodDays / 6)) === 0 || index === salesPoints.length - 1).map(point => (
                      <span key={point.date}>{point.date}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pedidos por status Donut Chart (4 cols) REATIVO */}
              <div className="lg:col-span-4 rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Pedidos por status</h3>
                  <p className="text-xs text-gray-400">Distribuição no período selecionado</p>
                </div>

                {/* Donut representation */}
                <div className="flex items-center justify-center my-3 relative">
                  <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" stroke="#161b3d" strokeWidth="11" fill="none" />

                    {/* Entregues (green) */}
                    <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="11" fill="none"
                      strokeDasharray={`${strokeDelivered} 240`} strokeDashoffset="0" />

                    {/* Em entrega (purple) */}
                    <circle cx="50" cy="50" r="38" stroke="#8b5cf6" strokeWidth="11" fill="none"
                      strokeDasharray={`${strokeInDelivery} 240`} strokeDashoffset={`-${strokeDelivered}`} />

                    {/* Pendentes (orange) */}
                    <circle cx="50" cy="50" r="38" stroke="#f59e0b" strokeWidth="11" fill="none"
                      strokeDasharray={`${strokePending} 240`} strokeDashoffset={`-${strokeDelivered + strokeInDelivery}`} />

                    {/* Em aprovação (blue) */}
                    <circle cx="50" cy="50" r="38" stroke="#3b82f6" strokeWidth="11" fill="none"
                      strokeDasharray={`${strokeApproval} 240`} strokeDashoffset={`-${strokeDelivered + strokeInDelivery + strokePending}`} />
                    <circle cx="50" cy="50" r="38" stroke="#ef4444" strokeWidth="11" fill="none"
                      strokeDasharray={`${strokeCancelled} 240`} strokeDashoffset={`-${strokeDelivered + strokeInDelivery + strokePending + strokeApproval}`} />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-white">{metrics.totalOrders}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                  </div>
                </div>

                {/* Status Legend com dados reais */}
                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span>Pendentes</span>
                    </span>
                    <span className="font-bold text-white">{metrics.pendingOrders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span>Em aprovação</span>
                    </span>
                    <span className="font-bold text-white">{metrics.approvalOrders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                      <span>Em entrega</span>
                    </span>
                    <span className="font-bold text-white">{metrics.inDeliveryOrders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Entregues</span>
                    </span>
                    <span className="font-bold text-white">{metrics.deliveredOrders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span>Cancelados</span>
                    </span>
                    <span className="font-bold text-white">{metrics.cancelledOrders}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* TABELA DE PEDIDOS RECENTES COM AÇÕES DINÂMICAS */}
            <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Pedidos recentes</h3>
                  <span className="text-xs text-gray-400">Total: {orders.length} pedidos registrados</span>
                </div>

                <span className="text-[11px] text-purple-300">Dados do checkout</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-purple-950/80 text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">#ID</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Roblox</th>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/50">
                    {orders.slice(0, 10).map((ord) => (
                      <tr key={ord.id} className="hover:bg-purple-950/20 transition">
                        <td className="py-3 px-4 font-mono font-bold text-purple-300">{ord.orderNumber}</td>
                        <td className="py-3 px-4 font-bold text-white">{ord.customerName}</td>
                        <td className="py-3 px-4 font-semibold text-purple-300 font-mono">{ord.robloxUsername === 'Não informado' ? 'Não informado' : `@${ord.robloxUsername}`}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {ord.productName}
                          {ord.variantName && <span className="text-gray-500 text-[11px] block">{ord.variantName}</span>}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{formatPrice(ord.priceUsd)}</td>
                        <td className="py-3 px-4">{getStatusBadge(ord.status)}</td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              handleTabChange('delivery');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-purple-950/60 border border-purple-800/40 px-2.5 py-1 text-purple-300 hover:bg-purple-600 hover:text-white transition font-bold"
                          >
                            <Eye className="h-3 w-3" /> Gerenciar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: PEDIDOS & SISTEMA DE APROVAÇÃO E ENVIO        */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'delivery' && (
          <div className="p-6 space-y-8">

            {/* Filter and Search Bar for Orders */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d1029] p-4 rounded-2xl border border-purple-950">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Buscar por ID, Cliente, Roblox ou Produto..."
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                {['ALL', 'Pendente', 'Em aprovação', 'Em entrega', 'Entregue', 'Cancelado'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      orderFilterStatus === st
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'border border-purple-950/60 bg-[#090c21] text-gray-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'Todos' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* STEPPER PROGRESS PIPELINE MATCHING IMAGE 1 */}
            {selectedOrder && (
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-black uppercase tracking-wider text-purple-300">
                    Fluxo de entrega manual dentro do Roblox
                  </h2>
                  <span className="text-xs text-gray-400">
                    Pedido selecionado: <strong className="text-white">{selectedOrder.orderNumber}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Step 1 */}
                  <div className={`flex flex-col items-center text-center p-3 rounded-2xl border ${
                    selectedOrder.status !== 'Cancelado' ? 'border-purple-600/60 bg-purple-950/20' : 'border-purple-950 bg-[#101438]/80'
                  }`}>
                    <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 mb-2">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white">1. Pedido realizado</h4>
                    <span className="text-[10px] text-gray-400 mt-0.5">Cliente finaliza a compra</span>
                  </div>

                  {/* Step 2 */}
                  <div className={`flex flex-col items-center text-center p-3 rounded-2xl border ${
                    ['Em aprovação', 'Em entrega', 'Entregue'].includes(selectedOrder.status) ? 'border-blue-600/60 bg-blue-950/20' : 'border-purple-950 bg-[#101438]/80'
                  }`}>
                    <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 mb-2">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white">2. Pagamento verificado</h4>
                    <span className="text-[10px] text-gray-400 mt-0.5">Administrador confere o comprovante</span>
                  </div>

                  {/* Step 3 */}
                  <div className={`flex flex-col items-center text-center p-3 rounded-2xl border ${
                    selectedOrder.status === 'Em aprovação' ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500 shadow-xl' : 'border-purple-950 bg-[#101438]/80'
                  }`}>
                    <div className="h-10 w-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/40 mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-purple-300">3. Aprovação manual</h4>
                    <span className="text-[10px] text-gray-300 mt-0.5">Você aprova o pedido</span>
                  </div>

                  {/* Step 4 */}
                  <div className={`flex flex-col items-center text-center p-3 rounded-2xl border ${
                    selectedOrder.status === 'Em entrega' ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500 shadow-xl' : 'border-purple-950 bg-[#101438]/80'
                  }`}>
                    <div className="h-10 w-10 rounded-full bg-slate-800 text-purple-400 flex items-center justify-center mb-2 border border-purple-900">
                      <Gamepad2 className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-300">4. Envio no Roblox</h4>
                    <span className="text-[10px] text-gray-500 mt-0.5">Entrega ao cliente</span>
                  </div>

                  {/* Step 5 */}
                  <div className={`flex flex-col items-center text-center p-3 rounded-2xl border ${
                    selectedOrder.status === 'Entregue' ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500 shadow-xl' : 'border-purple-950 bg-[#101438]/80'
                  }`}>
                    <div className="h-10 w-10 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center mb-2 border border-purple-900">
                      <Check className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-300">5. Pedido concluído</h4>
                    <span className="text-[10px] text-gray-500 mt-0.5">Cliente recebe o item</span>
                  </div>
                </div>
              </div>
            )}

            {/* ORDER CARD MATCHING IMAGE 1 */}
            {selectedOrder ? (
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl">

                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-purple-950/80 pb-4 mb-6 gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-white">
                      Pedido {selectedOrder.orderNumber}
                    </h3>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Realizado em {selectedOrder.createdAt}
                  </div>
                </div>

                {/* 4 Detail Columns Matching Image 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                  {/* 1. Informações do cliente */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Informações do cliente
                    </h4>

                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shrink-0">
                        {selectedOrder.customerName.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white">{selectedOrder.customerName}</span>
                        <span className="text-xs text-gray-400 truncate">{selectedOrder.customerEmail}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-bold text-purple-300">{selectedOrder.robloxUsername === 'Não informado' ? 'Roblox não informado' : `@${selectedOrder.robloxUsername} (Roblox)`}</span>
                      {selectedOrder.robloxUsername !== 'Não informado' && <button
                        onClick={() => handleCopyRoblox(selectedOrder.robloxUsername)}
                        className="flex items-center gap-1 rounded-md bg-purple-950 border border-purple-800/60 px-2 py-0.5 text-[10px] font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition"
                      >
                        {copiedRoblox ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        Copiar
                      </button>}
                    </div>
                  </div>

                  {/* 2. Produto */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Produto
                    </h4>

                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl overflow-hidden border border-purple-900 bg-[#080b1c] shrink-0">
                        <img src={selectedOrder.productThumb} alt={selectedOrder.productName} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white">{selectedOrder.variantName || selectedOrder.productName}</span>
                        <span className="text-xs text-gray-400 truncate">{selectedOrder.productCategory}</span>
                        <span className="text-xs font-black text-cyan-400 mt-0.5">{formatPrice(selectedOrder.priceUsd)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Pagamento */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Pagamento
                    </h4>

                    <div className="text-xs space-y-1 text-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Método:</span>
                        <span className="font-bold text-white">{selectedOrder.paymentMethod}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`rounded px-1.5 py-0.5 font-bold text-[10px] ${selectedOrder.paymentStatus === 'Confirmado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {selectedOrder.paymentStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">ID:</span>
                        <span className="font-mono text-[10px] text-gray-400">{selectedOrder.paymentId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Pago em:</span>
                        <span className="text-[10px] text-gray-300">{selectedOrder.paymentDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Observações do cliente */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Observações do cliente
                    </h4>

                    <div className="rounded-2xl border border-purple-950 bg-[#101438] p-3 text-xs text-gray-300 italic leading-relaxed">
                      "{selectedOrder.customerNotes || 'Sem observações adicionais.'}"
                    </div>
                  </div>

                </div>

                {/* ACTION BUTTONS BAR MATCHING IMAGE 1 */}
                <div className="mt-8 pt-6 border-t border-purple-950/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                  {/* 1. Aprovar pedido */}
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'Em aprovação')}
                    disabled={selectedOrder.paymentStatus === 'Confirmado'}
                    className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition font-bold disabled:opacity-40"
                  >
                    <span className="text-xs font-black">Verificar pagamento</span>
                    <span className="text-[10px] opacity-80 font-normal">Após conferir o comprovante</span>
                  </button>

                  {/* 2. Marcar como em entrega */}
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'Em entrega')}
                    className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-purple-600 px-4 py-3 text-white shadow-lg shadow-purple-600/25 hover:bg-purple-500 transition font-bold"
                  >
                    <span className="text-xs font-black">Marcar como em entrega</span>
                    <span className="text-[10px] opacity-80 font-normal">Estou entregando agora</span>
                  </button>

                  {/* 3. Marcar como entregue */}
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'Entregue')}
                    className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition font-bold"
                  >
                    <span className="text-xs font-black">Marcar como entregue</span>
                    <span className="text-[10px] opacity-80 font-normal">Cliente recebeu o item</span>
                  </button>

                  {/* 4. Cancelar pedido */}
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'Cancelado')}
                    className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 hover:bg-red-500 hover:text-white transition font-bold"
                  >
                    <span className="text-xs font-black">Cancelar pedido</span>
                    <span className="text-[10px] opacity-80 font-normal">Sem reembolso automático</span>
                  </button>

                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">Selecione um pedido para visualizar.</div>
            )}

            {/* LIST OF FILTERED ORDERS TO CHOOSE FROM */}
            <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4">
                Todos os Pedidos ({filteredOrders.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredOrders.map(ord => (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      selectedOrder?.id === ord.id
                        ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500'
                        : 'border-purple-950/80 bg-[#0a0d24] hover:border-purple-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-300 text-xs">{ord.orderNumber}</span>
                        {getStatusBadge(ord.status)}
                      </div>
                      <div className="font-bold text-white text-xs mt-1">{ord.customerName}</div>
                      <div className="text-[11px] text-gray-400 truncate">{ord.productName}</div>
                    </div>
                    <span className="font-extrabold text-cyan-400 text-xs">{formatPrice(ord.priceUsd)}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: GERENCIADOR DE JOGOS ROBLOX                   */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'games' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Jogos Roblox Cadastrados</h2>
                <p className="text-xs text-gray-400">
                  Cadastre novos jogos para selecionar ao criar produtos e exibir na barra de navegação.
                </p>
              </div>

              <button
                onClick={() => { setEditingGame(null); setNewGameFile(null); setNewGameForm({ name: '', thumb: '', description: '' }); setShowNewGameModal(true); }}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
              >
                <Plus className="h-4 w-4" /> Adicionar Novo Jogo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((g) => {
                const linkedCount = products.filter(p => (p.game_name || '').toLowerCase() === g.name.toLowerCase()
                  || (!p.game_name && (p.category.toLowerCase().includes(g.name.toLowerCase()) || p.title.toLowerCase().includes(g.name.toLowerCase())))).length;

                return (
                  <div key={g.id} className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-5 shadow-xl flex flex-col justify-between group hover:border-purple-500/50 transition">
                    <div>
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 border border-purple-950 bg-[#070914]">
                        <img src={g.thumb} alt={g.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                        <span className="absolute top-2 right-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-bold text-purple-300 backdrop-blur-md">
                          {linkedCount} produtos
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white">{g.name}</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {g.description || 'Itens, gamepasses e pets exclusivos.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-purple-950/80 flex items-center justify-between gap-2">
                      <Link
                        to={`/admin?game=${encodeURIComponent(g.name)}`}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300"
                      >
                        + Criar produto neste jogo
                      </Link>

                      <button type="button" onClick={() => {
                        setEditingGame(g);
                        setNewGameForm({ name: g.name, thumb: g.thumb || '/images/hero_banner.jpg', description: g.description || '' });
                        setNewGameFile(null);
                        setShowNewGameModal(true);
                      }} className="rounded-lg border border-purple-800/60 px-2 py-1 text-xs font-bold text-purple-200 hover:bg-purple-900/40">
                        Editar imagem
                      </button>

                      <button
                        onClick={async () => {
                          if (linkedCount > 0) {
                            showToast('Remova ou transfira os produtos deste jogo antes de excluí-lo.', 'error');
                            return;
                          }
                          if (!window.confirm(`Excluir o jogo "${g.name}"?`)) return;
                          try { await deleteStoredGame(g.id); showToast('Jogo removido.', 'info'); }
                          catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao excluir jogo.', 'error'); }
                        }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition"
                        title="Excluir Jogo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: GERENCIADOR DE CATEGORIAS                     */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'categories' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Categorias de Produtos</h2>
                <p className="text-xs text-gray-400">
                  Gerencie categorias (Pets, Gamepasses, Itens, Contas, etc.) para organizar seu catálogo.
                </p>
              </div>

              <button
                onClick={() => setShowNewCategoryModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
              >
                <Plus className="h-4 w-4" /> Nova Categoria
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => {
                const count = products.filter(p => p.category.toLowerCase() === c.name.toLowerCase()).length;

                return (
                  <div key={c.id} className="rounded-2xl border border-purple-950/80 bg-[#0d1029] p-4 flex items-center justify-between hover:border-purple-500/40 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{c.name}</h4>
                        <span className="text-[11px] text-gray-400">{count} produtos vinculados</span>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (count > 0) { showToast('A categoria contém produtos e não pode ser excluída.', 'error'); return; }
                        if (!window.confirm(`Excluir a categoria "${c.name}"?`)) return;
                        try { await deleteStoredCategory(c.id); showToast('Categoria removida.', 'info'); }
                        catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao excluir categoria.', 'error'); }
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition"
                      title="Excluir categoria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: ESTOQUE DE KEYS (MANTIDO INTACTO)             */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'keys' && (
          <div className="p-6 space-y-6">
            <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-purple-950 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-white">Estoque de Keys & Códigos Digitais</h3>
                  <p className="text-xs text-gray-400">Cadastre e acompanhe códigos digitais disponíveis.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    Disponíveis: {stockList.filter(k => k.status === 'AVAILABLE').length}
                  </span>
                  <button onClick={fetchStockList} className="p-2 rounded-lg bg-purple-950 text-purple-300 hover:text-white">
                    <RefreshCw className={`h-4 w-4 ${loadingStock ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Produto Alvo</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-xl border border-purple-950 bg-[#080b1c] p-3 text-xs text-white"
                  >
                    <option value="default-product">Geral / Produto Padrão</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>

                  <button
                    onClick={async () => {
                      if (!newKeysText.trim()) return;
                      const lines = newKeysText.split('\n').map(l => l.trim()).filter(Boolean);
                      const rows = lines.map(c => ({ product_id: selectedProductId, content: c, status: 'AVAILABLE' }));
                      await supabase.from('digital_keys').insert(rows);
                      setNewKeysText('');
                      fetchStockList();
                      showToast(`${lines.length} key(s) adicionada(s)!`, 'success');
                    }}
                    className="mt-4 w-full rounded-xl bg-purple-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition"
                  >
                    <Plus className="h-4 w-4 inline mr-1" /> Adicionar Keys
                  </button>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Cole as Keys (uma por linha)</label>
                  <textarea
                    rows={4}
                    value={newKeysText}
                    onChange={(e) => setNewKeysText(e.target.value)}
                    placeholder="SLENDER-KEY-1111&#10;SLENDER-KEY-2222"
                    className="w-full rounded-xl border border-purple-950 bg-[#080b1c] p-3 text-xs font-mono text-purple-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: CRIAR NOVO JOGO ROBLOX                        */}
      {/* ---------------------------------------------------- */}
      {showNewGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-purple-500/40 bg-[#0d1029] p-6 shadow-2xl relative">
            <button
              onClick={() => { setShowNewGameModal(false); setEditingGame(null); setNewGameFile(null); }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">{editingGame ? 'Editar Jogo Roblox' : 'Adicionar Novo Jogo Roblox'}</h3>
            <p className="text-xs text-gray-400 mb-5">A imagem escolhida aparecerá na loja para todos os visitantes.</p>

            <form onSubmit={handleCreateGameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nome do Jogo *</label>
                <input
                  type="text"
                  required
                  value={newGameForm.name}
                  onChange={(e) => setNewGameForm({ ...newGameForm, name: e.target.value })}
                  placeholder="Ex: Anime Defenders, Fisch, Murder Mystery 2..."
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Descrição do Jogo</label>
                <input
                  type="text"
                  value={newGameForm.description}
                  onChange={(e) => setNewGameForm({ ...newGameForm, description: e.target.value })}
                  placeholder="Ex: Itens míticos, passes de temporada..."
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Imagem / Thumbnail</label>
                {newGameForm.thumb && <img src={newGameForm.thumb} alt="Imagem atual do jogo" className="mb-2 aspect-video w-full rounded-xl object-cover" />}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setNewGameFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] p-2.5 text-xs text-white" />
                <p className="mt-1 text-[10px] text-gray-400">JPG, PNG ou WebP · até 5 MB{newGameFile ? ` · selecionado: ${newGameFile.name}` : ''}</p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition"
              >
                {editingGame ? 'Salvar alterações' : 'Cadastrar Jogo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CRIAR NOVA CATEGORIA                          */}
      {/* ---------------------------------------------------- */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-purple-500/40 bg-[#0d1029] p-6 shadow-2xl relative">
            <button
              onClick={() => setShowNewCategoryModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">Nova Categoria</h3>
            <p className="text-xs text-gray-400 mb-4">Cadastre uma nova categoria de produto</p>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Boosts, Frutas Físicas, Gems..."
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition"
              >
                Salvar Categoria
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
