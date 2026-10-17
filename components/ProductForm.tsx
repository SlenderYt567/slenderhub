import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Product, ProductVariant, RobloxGame, ProductCategory } from '../types';
import {
  Package, ArrowLeft, Trash2, Upload, GripVertical, Check, Star,
  Truck, Key, Plus, FileText, Tag, HelpCircle, Bell, Moon, Search,
  Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Code, AlignLeft,
  ChevronDown, Image as ImageIcon, Sparkles, X, Gamepad2
} from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { uploadStoreImage } from '../lib/storeMedia';
import {
  getStoredGames, loadGames, saveGame, getStoredCategories, loadCategories, saveCategory, subscribeAdminStore
} from '../lib/adminStore';

interface ProductFormProps {
  mode: 'create' | 'edit';
}

const ProductForm: React.FC<ProductFormProps> = ({ mode }) => {
  const { addProduct, updateProduct, getProductDetail, showToast, authReady, isAdmin } = useStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // Dynamic Games & Categories from adminStore
  const [games, setGames] = useState<RobloxGame[]>(getStoredGames());
  const [categories, setCategories] = useState<ProductCategory[]>(getStoredCategories());

  // Form State
  const initialGameParam = searchParams.get('game') || 'Tap Simulator Reborn';
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [category, setCategory] = useState('Pets');
  const [game, setGame] = useState(initialGameParam);
  const selectedGameId = games.find(g => g.name === game)?.id;
  const availableCategories = useMemo(() => {
    const unique = new Map<string, ProductCategory>();
    categories.filter(c => !c.gameId || c.gameId === selectedGameId)
      .forEach(c => unique.set(c.name.toLowerCase(), c));
    return [...unique.values()];
  }, [categories, selectedGameId]);
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('');
  const [featured, setFeatured] = useState(false);
  const [manualDelivery, setManualDelivery] = useState(true);
  const [digitalProduct, setDigitalProduct] = useState(false);
  const [image, setImage] = useState('');

  // Variations list matching Image 2
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState('');
  const loadedProductId = useRef<string | null>(null);

  // Quick modals for adding game/category on the fly
  const [showQuickAddGame, setShowQuickAddGame] = useState(false);
  const [quickGameName, setQuickGameName] = useState('');
  const [quickGameThumb, setQuickGameThumb] = useState('');
  const [quickGameFile, setQuickGameFile] = useState<File | null>(null);

  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');

  // Subscribe to changes in games/categories
  useEffect(() => {
    void Promise.all([loadGames(), loadCategories()]).catch(() => {
      showToast('Não foi possível carregar jogos e categorias.', 'error');
    });
    const unsub = subscribeAdminStore(() => {
      setGames(getStoredGames());
      setCategories(getStoredCategories());
    });
    return unsub;
  }, []);

  // Load existing product if edit mode
  useEffect(() => {
    if (mode === 'create' || !id || !authReady || !isAdmin || loadedProductId.current === id) return;
    loadedProductId.current = id;

    getProductDetail(id).then((p) => {
      if (p) {
        setTitle(p.title);
        setShortDesc(p.short_description || '');
        setFullDesc(p.description);
        setCategory(p.category || 'Pets');
        setGame(p.game_name || '');
        setPrice(p.price.toString());
        setOriginalPrice(p.original_price?.toString() || '');
        setStock(p.stock.toString());
        setFeatured(p.featured ?? false);
        setImage(p.image || '');
        setManualDelivery(p.delivery_mode !== 'digital');
        setDigitalProduct(p.delivery_mode === 'digital');
        setVariants(p.variants || []);
      } else {
        setLoadError('Produto não encontrado.');
      }
    }).catch(() => setLoadError('Não foi possível carregar o produto.'))
      .finally(() => setLoadingProduct(false));
  }, [id, mode, getProductDetail, authReady, isAdmin]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadStoreImage(file, 'products'));
      showToast('Imagem carregada com sucesso!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao enviar imagem.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddVariant = () => {
    const newId = 'var-' + Date.now();
    setVariants(prev => [
      ...prev,
      { id: newId, name: '', price: 0, stock: 0, image }
    ]);
  };

  const handleRemoveVariant = (variantId: string) => {
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const handleUpdateVariant = (variantId: string, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: value } : v));
  };

  const handleSaveQuickGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGameName.trim()) return;
    if (!quickGameFile) {
      showToast('Selecione uma imagem do seu computador para o jogo.', 'error');
      return;
    }
    try {
      const thumb = quickGameFile ? await uploadStoreImage(quickGameFile, 'games') : quickGameThumb;
      const created = await saveGame({ name: quickGameName.trim(), thumb });
      setGame(created.name);
      setQuickGameName('');
      setQuickGameFile(null);
      setShowQuickAddGame(false);
      showToast(`Jogo "${created.name}" cadastrado e selecionado!`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha ao cadastrar jogo.', 'error');
    }
  };

  const handleSaveQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    if (!selectedGameId) {
      showToast('Selecione um jogo antes de criar uma categoria para ele.', 'error');
      return;
    }
    if (availableCategories.some(c => c.name.toLowerCase() === quickCatName.trim().toLowerCase())) {
      showToast('Esta categoria já está disponível para o jogo.', 'error');
      return;
    }
    try {
      const created = await saveCategory({ name: quickCatName.trim(), gameId: selectedGameId });
      setCategory(created.name);
      setQuickCatName('');
      setShowQuickAddCat(false);
      showToast(`Categoria "${created.name}" cadastrada e selecionada!`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha ao cadastrar categoria.', 'error');
    }
  };

  const handleSubmit = async (isDraft = false) => {
    if (savingRef.current || uploading) return;
    if (!isDraft && !title.trim()) {
      showToast('Informe o nome do produto.', 'error');
      return;
    }
    const numPrice = price.trim() ? Number(price) : 0;
    if ((!isDraft && !price.trim()) || !Number.isFinite(numPrice) || numPrice < 0) {
      showToast('Informe um preço válido.', 'error');
      return;
    }
    const numStock = stock.trim() ? Number(stock) : 0;
    if ((!isDraft && !stock.trim()) || !Number.isSafeInteger(numStock) || numStock < 0) {
      showToast('O estoque deve ser um número inteiro maior ou igual a zero.', 'error');
      return;
    }
    const numOriginalPrice = originalPrice.trim() ? Number(originalPrice) : null;
    if (numOriginalPrice !== null && (!Number.isFinite(numOriginalPrice) || numOriginalPrice <= numPrice)) {
      showToast('O preço original deve ser maior que o preço atual.', 'error');
      return;
    }
    if (!isDraft && (!category.trim() || !game.trim() || !(fullDesc.trim() || shortDesc.trim()))) {
      showToast('Preencha categoria, jogo e descrição.', 'error');
      return;
    }
    if (variants.some(v => !v.name.trim() || !Number.isFinite(v.price) || v.price < 0
      || (v.stock != null && (!Number.isSafeInteger(v.stock) || v.stock < 0)))) {
      showToast('Revise o nome, preço e estoque das variações.', 'error');
      return;
    }
    const validImageSource = (source: string) => {
      if (!source || source.startsWith('/') || source.startsWith('data:image/')
        || /^([\w.-]+\/)*[\w.-]+\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(source)) return true;
      try {
        const url = new URL(source);
        return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
      } catch {
        return false;
      }
    };
    if (!validImageSource(image) || variants.some(v => !validImageSource(v.image || ''))) {
      showToast('Use uma URL http ou https válida para a imagem.', 'error');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const productPayload: Product = {
        id: id || `prod-${crypto.randomUUID()}`,
        title: title.trim() || 'Produto sem título (rascunho)',
        description: fullDesc.trim() || shortDesc.trim() || 'Rascunho em edição.',
        price: numPrice,
        image,
        category: category.trim() || 'Sem categoria',
        game_name: game,
        short_description: shortDesc.trim() || null,
        original_price: numOriginalPrice,
        delivery_mode: digitalProduct ? 'digital' : 'manual',
        is_draft: isDraft,
        stock: numStock,
        featured,
        variants: variants.length > 0 ? variants : undefined,
      };

      if (mode === 'edit') {
        const saved = await updateProduct(productPayload);
        if (!saved) throw new Error('O banco não confirmou a edição.');
        showToast(isDraft ? 'Rascunho salvo!' : 'Produto atualizado com sucesso!', 'success');
      } else {
        const saved = await addProduct(productPayload);
        if (!saved) throw new Error('O banco não confirmou o cadastro.');
        showToast(isDraft ? 'Rascunho salvo com sucesso!' : 'Produto cadastrado com sucesso!', 'success');
      }

      navigate('/admin-dashboard');
    } catch (err: any) {
      showToast(`Erro ao salvar produto: ${err.message || 'Falha de conexão'}`, 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!authReady || (mode === 'edit' && loadingProduct && isAdmin)) {
    return <div className="min-h-screen bg-[#070914] grid place-items-center text-purple-200">Carregando produto…</div>;
  }
  if (!isAdmin) return <Navigate to="/login" replace />;
  if (loadError) return <div className="min-h-screen bg-[#070914] grid place-items-center text-red-300">{loadError}</div>;

  return (
    <div className="min-h-screen bg-[#070914] text-white flex">

      {/* SIDEBAR MATCHING IMAGE 2 */}
      <aside className="w-64 shrink-0 border-r border-purple-950/60 bg-[#090c1f] flex flex-col justify-between hidden md:flex">
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-purple-950/60">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 font-black text-white text-base shadow-md">
                S
              </div>
              <span className="font-extrabold text-base tracking-wider text-white">
                SLENDER<span className="text-purple-400">HUB</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 text-xs font-bold">
            <Link to="/admin-dashboard" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition">
              <Package className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link to="/admin-dashboard?tab=delivery" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition">
              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4" />
                <span>Pedidos</span>
              </div>
            </Link>

            {/* Expanded Produtos Group */}
            <div className="pt-1 pb-1">
              <div className="flex items-center justify-between px-3.5 py-2 text-purple-300 font-extrabold bg-purple-950/40 rounded-xl border border-purple-800/40">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-purple-400" />
                  <span>Produtos</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>

              <div className="pl-9 pr-2 py-1.5 space-y-1">
                <Link to="/" className="block py-1.5 text-gray-400 hover:text-white transition">Todos os Produtos</Link>
                <div className="py-1.5 text-purple-400 font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  Adicionar Produto
                </div>
                <Link to="/admin-dashboard?tab=categories" className="block py-1.5 text-gray-400 hover:text-white transition">
                  Categorias ({categories.length})
                </Link>
                <Link to="/admin-dashboard?tab=keys" className="block py-1.5 text-gray-400 hover:text-white transition">Estoque</Link>
              </div>
            </div>

            <div className="pt-2 text-[10px] font-black uppercase tracking-wider text-gray-600 px-3">
              Geral
            </div>

            <Link to="/admin-dashboard?tab=games" className="flex items-center justify-between px-3.5 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition">
              <div className="flex items-center gap-3">
                <Gamepad2 className="h-4 w-4" />
                <span>Jogos</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">{games.length}</span>
            </Link>

          </nav>
        </div>

        {/* Admin profile footer */}
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

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* TOP BAR MATCHING IMAGE 2 */}
        <header className="h-16 border-b border-purple-950/60 bg-[#090c1f]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-purple-200">Cadastro de produtos</span>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-purple-950 bg-[#0c0f24] px-3 py-1.5 text-xs font-bold text-purple-300">
              USD
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <div className="p-6 space-y-6">

          {/* PAGE HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Package className="h-4 w-4" />
                </div>
                {mode === 'edit' ? 'Editar Produto' : 'Adicionar Produto'}
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                {mode === 'edit' ? 'Atualize as informações, imagens e opções deste produto.' : 'Cadastre um novo item, gamepass ou serviço para sua loja.'}
              </p>
            </div>

            <Link
              to="/admin-dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para produtos
            </Link>
          </div>

          {/* 4-STEP WIZARD PROGRESS BAR MATCHING IMAGE 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-purple-950/80 bg-[#0d1029]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 font-black text-white text-xs shadow-md shadow-purple-600/40">
                1
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-purple-300">Informações</span>
                <span className="text-[10px] text-gray-400 truncate">Dados básicos do produto</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-gray-400 font-bold text-xs border border-purple-950">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-gray-300">Preços e Estoque</span>
                <span className="text-[10px] text-gray-500 truncate">Defina valores e quantidade</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-gray-400 font-bold text-xs border border-purple-950">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-gray-300">Mídia e Descrição</span>
                <span className="text-[10px] text-gray-500 truncate">Imagens e detalhes</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-gray-400 font-bold text-xs border border-purple-950">
                4
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-gray-300">Configurações</span>
                <span className="text-[10px] text-gray-500 truncate">Finalização</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN FORM LAYOUT MATCHING IMAGE 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: INFORMAÇÕES BÁSICAS, PREÇO/ESTOQUE, VARIAÇÕES */}
            <div className="lg:col-span-7 space-y-6">

              {/* CARD 1: Informações Básicas com Categoria e Jogo Dinâmicos */}
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-purple-950/80 pb-3">
                  <FileText className="h-4 w-4 text-purple-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">Informações Básicas</h3>
                    <p className="text-[11px] text-gray-400">Defina as informações principais do produto.</p>
                  </div>
                </div>

                {/* Nome do Produto */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Nome do Produto <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Huge Fire Dragon (Tap Simulator Reborn)"
                    className="w-full rounded-xl border border-purple-950 bg-[#080b1c] p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Grid: Categoria & Jogo com botões para adicionar novos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-300">
                        Categoria <span className="text-red-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCat(true)}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                      >
                        <Plus className="h-3 w-3" /> Nova
                      </button>
                    </div>

                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-purple-950 bg-[#080b1c] p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {category && !availableCategories.some(c => c.name === category) && (
                        <option value={category}>{category} (categoria antiga)</option>
                      )}
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Jogo */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-300">
                        Jogo Roblox <span className="text-red-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddGame(true)}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                      >
                        <Plus className="h-3 w-3" /> Novo Jogo
                      </button>
                    </div>

                    <select
                      value={game}
                      onChange={(e) => {
                        const nextGame = e.target.value;
                        const nextGameId = games.find(g => g.name === nextGame)?.id;
                        setGame(nextGame);
                        if (!categories.some(c => c.name === category && (!c.gameId || c.gameId === nextGameId))) {
                          setCategory('Pets');
                        }
                      }}
                      className="w-full rounded-xl border border-purple-950 bg-[#080b1c] p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {games.map((g) => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Descrição Curta */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      Descrição Curta
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {shortDesc.length}/150
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={150}
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    placeholder="Pet mítico com grande poder no Tap Simulator Reborn."
                    className="w-full rounded-xl border border-purple-950 bg-[#080b1c] p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* CARD 2: Preço e Estoque */}
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-purple-950/80 pb-3">
                  <Tag className="h-4 w-4 text-purple-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">Preço e Estoque</h3>
                    <p className="text-[11px] text-gray-400">Defina o valor, quantidade e variações do produto.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Preço USD */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Preço (USD) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="12.00"
                        className="w-full rounded-xl border border-purple-950 bg-[#080b1c] py-2.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Preço Original */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Preço Original (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-purple-950 bg-[#080b1c] py-2.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 mt-1 block">Deixe em branco se não houver desconto.</span>
                  </div>

                  {/* Estoque */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Estoque <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="10"
                      className="w-full rounded-xl border border-purple-950 bg-[#080b1c] py-2.5 px-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <span className="text-[9px] text-gray-500 mt-1 block">0 = Esgotado</span>
                  </div>
                </div>

                {/* Toggle: Produto em Destaque */}
                <div className="flex items-center justify-between rounded-2xl border border-purple-950 bg-[#0a0d24] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400">
                      <Star className="h-4 w-4 fill-purple-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Produto em destaque</span>
                      <span className="text-[10px] text-gray-400">Aparece na página inicial e em destaque.</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFeatured(!featured)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      featured ? 'bg-purple-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        featured ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>

              {/* CARD 3: Variações (Opcional) */}
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-purple-950/80 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Variações (Opcional)</h3>
                    <p className="text-[11px] text-gray-400">Adicione diferentes opções do produto (ex: diferentes pets).</p>
                  </div>
                  <span className="text-xs font-bold text-purple-400">{variants.length} opções</span>
                </div>

                {/* Variations list */}
                <div className="space-y-2.5">
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-purple-950 bg-[#090c21] p-3 transition hover:border-purple-800"
                    >
                      <GripVertical className="h-4 w-4 text-gray-600 shrink-0 cursor-grab" />

                      <label className="relative h-8 w-8 rounded-lg overflow-hidden border border-purple-900 bg-slate-900 shrink-0 cursor-pointer" title="Enviar imagem da variação">
                        {v.image || image ? <img src={v.image || image} alt={v.name} className="h-full w-full object-cover" /> : <ImageIcon className="m-2 h-4 w-4 text-purple-400" />}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          try { handleUpdateVariant(v.id, 'image', await uploadStoreImage(file, 'products')); }
                          catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao enviar imagem.', 'error'); }
                          finally { setUploading(false); }
                        }} />
                      </label>

                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleUpdateVariant(v.id, 'name', e.target.value)}
                        placeholder="Nome da variação"
                        className="flex-1 rounded-lg border border-purple-950 bg-[#060817] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />

                      <select value={v.category || ''} onChange={e => handleUpdateVariant(v.id, 'category', e.target.value || undefined)}
                        aria-label={`Tipo de item da variação ${v.name || 'sem nome'}`}
                        className="w-32 rounded-lg border border-purple-950 bg-[#060817] px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500">
                        <option value="">Tipo do produto</option>
                        {v.category && !availableCategories.some(c => c.name === v.category) && <option value={v.category}>{v.category}</option>}
                        {availableCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>

                      <div className="relative w-24">
                        <span className="absolute left-2 top-2 text-[10px] text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={v.price}
                          onChange={(e) => handleUpdateVariant(v.id, 'price', Number(e.target.value))}
                          placeholder="12.00"
                          className="w-full rounded-lg border border-purple-950 bg-[#060817] py-1.5 pl-5 pr-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      <input
                        type="number"
                        value={v.stock ?? 0}
                        step="1"
                        min="0"
                        onChange={(e) => handleUpdateVariant(v.id, 'stock', Number(e.target.value))}
                        placeholder="Estoque"
                        className="w-16 rounded-lg border border-purple-950 bg-[#060817] py-1.5 px-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition"
                        title="Remover variação"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <label className="w-full pl-7 text-[11px] text-gray-400">
                        URL da imagem da variação
                        <input
                          type="text"
                          inputMode="url"
                          value={v.image || ''}
                          onChange={e => handleUpdateVariant(v.id, 'image', e.target.value)}
                          placeholder="https://exemplo.com/pet.png"
                          className="mt-1 w-full rounded-lg border border-purple-950 bg-[#060817] px-2.5 py-2 text-xs text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="w-full py-2.5 rounded-xl border border-dashed border-purple-700/60 bg-purple-950/20 text-xs font-bold text-purple-300 hover:bg-purple-900/30 hover:text-white transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Variação
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: IMAGEM, DESCRIÇÃO COMPLETA, CONFIGURAÇÕES */}
            <div className="lg:col-span-5 space-y-6">

              {/* CARD 4: Imagem do Produto */}
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-purple-950/80 pb-3">
                  <ImageIcon className="h-4 w-4 text-purple-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">Imagem do Produto</h3>
                    <p className="text-[11px] text-gray-400">Envie um arquivo ou informe a URL da imagem.</p>
                  </div>
                </div>

                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-purple-500/30 bg-[#080b1c] group shadow-inner">
                  {image ? <img src={image} alt="Preview do Produto" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-purple-300"><ImageIcon className="h-10 w-10" /><span className="text-xs">Envie a imagem do produto</span></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="h-8 w-8 text-white mb-2" />
                    <span className="text-xs font-bold text-white">Trocar Imagem</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <label className="block text-[11px] text-gray-400">
                  URL da imagem do produto
                  <input
                    type="text"
                    inputMode="url"
                    value={image.startsWith('data:') ? '' : image}
                    onChange={e => setImage(e.target.value)}
                    placeholder="https://exemplo.com/produto.png"
                    className="mt-1 w-full rounded-lg border border-purple-950 bg-[#060817] px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                  {image.startsWith('data:') && <span className="mt-1 block text-gray-500">Imagem enviada como arquivo. Cole uma URL para substituí-la.</span>}
                </label>

                <div className="flex items-center gap-2.5">
                  {['/images/fire_dragon.jpg', '/images/shinigami.jpg', '/images/gargantuan.jpg'].map((sampleImg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImage(sampleImg)}
                      className={`relative aspect-square w-16 rounded-xl overflow-hidden border transition ${
                        image === sampleImg ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-purple-950 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={sampleImg} alt="sample" className="h-full w-full object-cover" />
                    </button>
                  ))}

                  <label className="flex flex-col items-center justify-center aspect-square w-16 rounded-xl border border-dashed border-purple-800 bg-[#080a1c] text-purple-400 hover:text-white hover:border-purple-500 cursor-pointer transition">
                    <Plus className="h-4 w-4" />
                    <span className="text-[9px] font-bold mt-0.5">Adicionar</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* CARD 5: Descrição Completa */}
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl space-y-3">
                <div className="border-b border-purple-950/80 pb-3">
                  <h3 className="text-sm font-black text-white">Descrição Completa</h3>
                  <p className="text-[11px] text-gray-400">Descreva o produto em detalhes.</p>
                </div>

                <textarea
                  rows={5}
                  value={fullDesc}
                  onChange={(e) => setFullDesc(e.target.value)}
                  className="w-full rounded-2xl border border-purple-950 bg-[#080b1c] p-3 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              {/* CARD 6: Configurações Adicionais */}
              <div className="rounded-3xl border border-purple-950/80 bg-[#0d1029] p-6 shadow-xl space-y-4">
                <div className="border-b border-purple-950/80 pb-3">
                  <h3 className="text-sm font-black text-white">Configurações Adicionais</h3>
                  <p className="text-[11px] text-gray-400">Outras opções importantes.</p>
                </div>

                {/* Toggle 1: Entrega manual */}
                <div className="flex items-center justify-between rounded-2xl border border-purple-950 bg-[#0a0d24] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Entrega manual</span>
                      <span className="text-[10px] text-gray-400">Produto entregue manualmente no Roblox.</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setManualDelivery(true); setDigitalProduct(false); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      manualDelivery ? 'bg-purple-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        manualDelivery ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 2: Produto digital */}
                <div className="flex items-center justify-between rounded-2xl border border-purple-950 bg-[#0a0d24] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                      <Key className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Produto digital</span>
                      <span className="text-[10px] text-gray-400">Entrega digital após aprovação da equipe.</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setDigitalProduct(true); setManualDelivery(false); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      digitalProduct ? 'bg-purple-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        digitalProduct ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>

            </div>

          </div>

          {/* BOTTOM ACTIONS BAR MATCHING IMAGE 2 */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-950/80">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSubmit(true)}
              className="rounded-xl border border-purple-800/60 bg-[#0d1029] px-6 py-3 text-xs font-bold text-purple-200 hover:bg-purple-900/30 hover:text-white transition"
            >
              Salvar como rascunho
            </button>

            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-3 text-xs font-bold text-white shadow-xl shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
            >
              <Package className="h-4 w-4" />
              {saving ? 'Adicionando…' : mode === 'edit' ? 'Salvar Alterações' : 'Adicionar produto'}
            </button>
          </div>

        </div>

      </div>

      {/* QUICK MODAL: ADICIONAR NOVO JOGO ROBLOX */}
      {showQuickAddGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-purple-500/40 bg-[#0d1029] p-6 shadow-2xl relative">
            <button onClick={() => setShowQuickAddGame(false)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-white mb-1">Cadastrar Novo Jogo</h3>
            <p className="text-xs text-gray-400 mb-4">Adicione o jogo para selecioná-lo neste produto</p>
            <form onSubmit={handleSaveQuickGame} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nome do Jogo *</label>
                <input
                  type="text"
                  required
                  value={quickGameName}
                  onChange={(e) => setQuickGameName(e.target.value)}
                  placeholder="Ex: Fisch, Murder Mystery 2..."
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Miniatura</label>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setQuickGameFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] p-2.5 text-xs text-white" />
                <p className="mt-1 text-[10px] text-gray-400">Escolha uma imagem do computador (até 5 MB).</p>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition"
              >
                Cadastrar e Selecionar Jogo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MODAL: ADICIONAR NOVA CATEGORIA */}
      {showQuickAddCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-purple-500/40 bg-[#0d1029] p-6 shadow-2xl relative">
            <button onClick={() => setShowQuickAddCat(false)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-white mb-1">Cadastrar Nova Categoria</h3>
            <p className="text-xs text-gray-400 mb-4">Adicione um tipo de item para {game || 'o jogo selecionado'}.</p>
            <form onSubmit={handleSaveQuickCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={quickCatName}
                  onChange={(e) => setQuickCatName(e.target.value)}
                  placeholder="Ex: Frutas Físicas, Gems, Boosts..."
                  className="w-full rounded-xl border border-purple-950 bg-[#070a1a] p-2.5 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition"
              >
                Cadastrar e Selecionar
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductForm;
