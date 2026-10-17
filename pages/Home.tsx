import React, { useState, useMemo, useEffect } from 'react';
import { Search, Rocket, Shield, HelpCircle, Package, Headset, CreditCard, Star, ArrowRight, Gamepad2, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';
import { getStoredGames, loadGames, subscribeAdminStore } from '../lib/adminStore';

const Home: React.FC = () => {
  const { products, loading, productsError, reloadProducts } = useStore();
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState(getStoredGames());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    void loadGames().catch(() => undefined);
    return subscribeAdminStore(() => {
      setGames(getStoredGames());
    });
  }, []);

  const gameCategories = useMemo<{ id: string; name: string; thumb?: string }[]>(() => [
    { id: 'all', name: 'Todos' },
    ...games.map(g => ({ id: g.name, name: g.name, thumb: g.thumb })),
  ], [games]);

  // Sync search from URL query (e.g. from navbar search)
  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('cat');
    setSearchQuery(q || '');
    setSelectedCategory(cat === 'featured' ? '__featured'
      : cat === 'gamepass' ? '__gamepasses'
      : cat === 'item' ? '__items' : 'all');
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query ||
        product.title.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      let matchesCat = true;
      if (selectedCategory === '__featured') matchesCat = Boolean(product.featured);
      else if (selectedCategory === '__gamepasses') matchesCat = /gamepass/i.test(product.category);
      else if (selectedCategory === '__items') matchesCat = !/gamepass/i.test(product.category);
      else if (selectedCategory !== 'all') {
        const productGame = product.game_name || '';
        matchesCat = productGame.toLowerCase() === selectedCategory.toLowerCase()
          || (!productGame && (product.category.toLowerCase().includes(selectedCategory.toLowerCase())
            || product.title.toLowerCase().includes(selectedCategory.toLowerCase())));
      }

      return matchesSearch && matchesCat;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070914] text-white">

      {/* Panoramic hero */}
      <section className="relative overflow-hidden border-b border-purple-950/40 bg-[#080b20] pt-12 pb-10 lg:pt-20 lg:pb-12">
        <div className="absolute inset-0 bg-cover bg-[position:78%_center] opacity-75 lg:bg-center lg:opacity-100" style={{ backgroundImage: 'url(/images/hero-v2.webp)' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070914] via-[#070914]/95 to-[#070914]/25 lg:via-[#070914]/80 lg:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070914] via-transparent to-[#070914]/10" />
        {/* Ambient background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-purple-600/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-12 left-10 w-96 h-96 bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute right-0 top-1/3 w-96 h-96 bg-cyan-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[430px] grid-cols-1 items-center gap-12 lg:grid-cols-12">

            {/* Left Hero Text */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 shadow-lg shadow-purple-900/20 backdrop-blur-md">
                <Shield className="h-3.5 w-3.5 text-purple-400" />
                <span>A sua loja de itens Roblox</span>
              </div>

              {/* Headline */}
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-[4.3rem] leading-[1.04]">
                EVOLUA NO ROBLOX <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
                  COM SEGURANÇA
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 max-w-xl text-base sm:text-lg text-gray-300/90 leading-relaxed font-normal">
                Gamepasses, itens, pets e muito mais dos seus jogos favoritos. Entrega manual, suporte rápido e preços incríveis.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Rocket className="h-4 w-4" />
                  Ver produtos
                </button>

                <button
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-purple-900/50 bg-[#0f1430]/70 px-6 py-3.5 text-sm font-bold text-gray-200 backdrop-blur-md transition-all hover:border-purple-500/50 hover:bg-[#141b40] hover:text-white"
                >
                  <HelpCircle className="h-4 w-4 text-purple-400" />
                  Como funciona?
                </button>
              </div>
            </div>

            <div className="hidden lg:col-span-5 lg:flex h-full items-end justify-end pb-4">
              <div className="rounded-2xl border border-purple-400/40 bg-[#0c0f2b]/80 px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-cyan-200 shadow-xl backdrop-blur-md">
                Pets exclusivos · Gamepasses · Itens raros
              </div>
            </div>

          </div>

          {/* 4 VALUE PROPOSITIONS BAR MATCHING IMAGE 1 */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">

            {/* 1. Entrega Manual */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-purple-950/60 bg-[#0e122b]/80 p-4 backdrop-blur-md transition hover:border-purple-500/40">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600/15 text-purple-400 border border-purple-500/20">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">Entrega Manual</span>
                <span className="text-xs text-gray-400 truncate">Segura e confiável</span>
              </div>
            </div>

            {/* 2. Suporte 24/7 */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-purple-950/60 bg-[#0e122b]/80 p-4 backdrop-blur-md transition hover:border-purple-500/40">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20">
                <Headset className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">Suporte</span>
                <span className="text-xs text-gray-400 truncate">via Discord e Email</span>
              </div>
            </div>

            {/* 3. Pagamentos Seguros */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-purple-950/60 bg-[#0e122b]/80 p-4 backdrop-blur-md transition hover:border-purple-500/40">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-600/15 text-cyan-400 border border-cyan-500/20">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">Pagamentos Seguros</span>
                <span className="text-xs text-gray-400 truncate">Pix e cripto</span>
              </div>
            </div>

            {/* 4. Mais de 10.000+ */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-purple-950/60 bg-[#0e122b]/80 p-4 backdrop-blur-md transition hover:border-purple-500/40">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600/15 text-amber-400 border border-amber-500/20">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">Jogos favoritos</span>
                <span className="text-xs text-gray-400 truncate">Itens e gamepasses</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* GAME / CATEGORY CHIPS BAR MATCHING IMAGE 1 */}
      <section id="games" className="border-b border-purple-950/40 bg-[#080b1a] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
            {gameCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl p-1.5 pb-2 text-center text-[11px] font-bold leading-tight transition-all sm:w-36 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 scale-[1.03] ring-1 ring-purple-400'
                      : 'border border-purple-950/60 bg-[#0e132e] text-gray-300 hover:border-purple-500/40 hover:bg-[#141a40] hover:text-white'
                  }`}
                >
                  {cat.thumb ? (
                    <img
                      src={cat.thumb}
                      alt={cat.name}
                    className="h-16 w-full rounded-xl object-cover ring-1 ring-purple-500/30 sm:h-20"
                    />
                  ) : (
                    <div className="flex h-16 w-full items-center justify-center rounded-xl bg-purple-950 text-purple-300 sm:h-20">
                      <Gamepad2 className="h-7 w-7" />
                    </div>
                  )}
                  <span className="line-clamp-2 min-h-7">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MAIN CATALOG & PRODUCTS EM DESTAQUE */}
      <main id="catalog" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              Produtos da loja
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Explore os itens e gamepasses disponíveis no catálogo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar catálogo..."
                className="rounded-xl border border-purple-900/40 bg-[#0e122b] py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-44 sm:w-56"
              />
            </div>

            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {productsError && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 flex items-center justify-between">
            <span>{productsError}</span>
            <button onClick={() => void reloadProducts()} className="underline font-bold">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && products.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold text-gray-400">Carregando catálogo Slender Hub…</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-purple-950/60 bg-[#0e122b]/50 py-16 px-4 text-center">
            <Package className="mx-auto h-12 w-12 text-purple-400/40 mb-3" />
            <h3 className="text-lg font-bold text-white">Nenhum produto encontrado</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Tente selecionar outra categoria ou limpar a busca para visualizar mais opções.
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="mt-4 rounded-xl bg-purple-600/30 border border-purple-500/40 px-4 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600/50 transition"
            >
              Resetar Filtros
            </button>
          </div>
        )}
      </main>

      {/* MODAL: COMO FUNCIONA A ENTREGA MANUAL */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-purple-500/40 bg-[#0d1029] p-6 shadow-2xl relative">
            <button
              onClick={() => setShowHowItWorks(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Como Funciona a Entrega Manual?</h3>
                <p className="text-xs text-gray-400">Acompanhe a compra e combine a entrega com o suporte.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-gray-300">
              <div className="flex items-start gap-3 rounded-2xl border border-purple-950 bg-[#121638] p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 font-bold text-white text-[11px]">1</span>
                <div>
                  <strong className="text-white block mb-0.5">Escolha seu item ou pet</strong>
                  Selecione o produto desejado e informe seu usuário do Roblox no checkout.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-purple-950 bg-[#121638] p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 font-bold text-white text-[11px]">2</span>
                <div>
                  <strong className="text-white block mb-0.5">Envie o comprovante</strong>
                  Pague com Pix ou cripto e envie o comprovante para análise da equipe.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-purple-950 bg-[#121638] p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 font-bold text-white text-[11px]">3</span>
                <div>
                  <strong className="text-white block mb-0.5">Trade no Jogo</strong>
                  Nosso atendente entra no seu servidor de Roblox e entrega os itens diretamente para a sua conta via Trade.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorks(false)}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110"
            >
              Entendido, vamos comprar!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;
