import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogIn, LogOut, Globe, Search, LayoutDashboard, PlusCircle, Menu, X, Shield, Sparkles } from 'lucide-react';
import { useStore } from '../store';

const Navbar: React.FC = () => {
  const { cart, isAuthenticated, isAdmin, logout, currency, setCurrency } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'BRL' : 'USD');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/?q=${encodeURIComponent(navSearch.trim())}`);
      const catalogEl = document.getElementById('catalog');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-purple-900/30 bg-[#070914]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform duration-300">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0c0f24] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 text-lg">
              S
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-wider text-white flex items-center">
              SLENDER<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">HUB</span>
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <div className="hidden lg:flex items-center gap-1.5 text-sm font-semibold">
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              isActive('/')
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Shop
          </Link>
          <Link
            to="/?cat=gamepass"
            className="px-3.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Gamepasses
          </Link>
          <Link
            to="/?cat=item"
            className="px-3.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Itens
          </Link>
          <a
            href="/#games"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-3.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Jogos
          </a>
          <Link
            to="/?cat=featured"
            className="px-3.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Promoções
          </Link>
          <Link
            to="/contact"
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              isActive('/contact')
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Contato
          </Link>

          {isAdmin && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-purple-900/40 pl-3">
              <Link
                to="/admin-dashboard"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  isActive('/admin-dashboard')
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-purple-950/60 text-purple-300 border border-purple-800/50 hover:bg-purple-900/50'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isActive('/admin')
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-900 text-gray-300 hover:text-white'
                }`}
                title="Adicionar Produto"
              >
                <PlusCircle className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Search Bar matching Image 1 */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xs relative items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-purple-400 pointer-events-none" />
          <input
            type="text"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Buscar por jogo, item ou gamepass..."
            className="w-full rounded-full border border-purple-900/40 bg-[#0e122b] py-1.5 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
          />
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">

          {/* Currency Toggle */}
          <button
            onClick={toggleCurrency}
            className="flex items-center gap-1.5 rounded-full border border-purple-900/30 bg-[#0f1430] px-3 py-1.5 text-xs font-bold text-gray-300 hover:border-purple-500/50 hover:text-white transition shadow-sm"
            title="Alternar Moeda (USD / BRL)"
          >
            <Globe className="h-3.5 w-3.5 text-purple-400" />
            <span>{currency}</span>
          </button>

          {/* Cart Icon */}
          <Link
            to="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-purple-900/30 bg-[#0f1430] text-gray-300 transition hover:border-purple-500/50 hover:text-white"
            title="Carrinho de Compras"
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-1 text-[10px] font-black text-white shadow-lg ring-2 ring-[#070914]">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Auth Button */}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-size-200 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition hover:brightness-110 active:scale-95"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Entrar</span>
            </Link>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-purple-900/40 bg-[#0f1430] text-gray-300 hover:text-white"
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-purple-900/30 bg-[#070914] px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-purple-400" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Buscar por jogo, item ou gamepass..."
              className="w-full rounded-xl border border-purple-900/40 bg-[#0e122b] py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </form>

          <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-sm font-semibold text-gray-200 hover:text-purple-400">Shop</Link>
          <Link to="/?cat=gamepass" onClick={() => setIsMenuOpen(false)} className="block py-2 text-sm font-semibold text-gray-200 hover:text-purple-400">Gamepasses</Link>
          <Link to="/?cat=item" onClick={() => setIsMenuOpen(false)} className="block py-2 text-sm font-semibold text-gray-200 hover:text-purple-400">Itens</Link>
          <Link to="/#games" onClick={() => setIsMenuOpen(false)} className="block py-2 text-sm font-semibold text-gray-200 hover:text-purple-400">Jogos</Link>
          <Link to="/?cat=featured" onClick={() => setIsMenuOpen(false)} className="block py-2 text-sm font-semibold text-gray-200 hover:text-purple-400">Promoções</Link>
          <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="block py-2 text-sm font-semibold text-gray-200 hover:text-purple-400">Contato</Link>

          {isAdmin && (
            <div className="pt-2 border-t border-purple-900/30 space-y-2">
              <Link to="/admin-dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 py-1.5 text-sm font-bold text-purple-400">
                <LayoutDashboard className="h-4 w-4" /> Painel de Admin
              </Link>
              <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 py-1.5 text-sm font-bold text-purple-400">
                <PlusCircle className="h-4 w-4" /> Adicionar Produto
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <div className="pt-2 border-t border-purple-900/30">
              <button onClick={handleLogout} className="flex items-center gap-2 py-1.5 text-sm font-bold text-red-400">
                <LogOut className="h-4 w-4" /> Sair da Conta
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
