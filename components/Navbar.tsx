import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, LogIn, LogOut, PlusCircle, Globe, Mail, LayoutDashboard, RefreshCcw, Lock, Menu, X } from 'lucide-react';
import { useStore } from '../store';

const Navbar: React.FC = () => {
  const { cart, isAuthenticated, isAdmin, logout, currency, setCurrency } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const isActive = (path: string) => location.pathname === path ? 'text-blue-500' : 'text-gray-400 hover:text-white';

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'BRL' : 'USD');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 font-bold text-white shadow-lg shadow-blue-500/20">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Slender <span className="text-blue-500">Hub</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/" className={`hidden text-sm font-medium transition md:block ${isActive('/')}`}>
            Shop
          </Link>
          <Link to="/contact" className={`hidden text-sm font-medium transition md:block ${isActive('/contact')}`}>
            Contact
          </Link>
          <Link to="/pricing" className={`hidden text-sm font-medium transition md:block ${isActive('/pricing')}`}>
            Pricing
          </Link>
          {isAuthenticated && (
            <Link to="/developer-panel" className={`hidden text-sm font-medium transition md:block ${isActive('/developer-panel')}`}>
              Developer Panel
            </Link>
          )}

          {isAdmin && (
            <>
              <Link to="/admin-dashboard" className={`hidden text-sm font-medium transition md:block ${isActive('/admin-dashboard')}`}>
                Dashboard
              </Link>
              <Link to="/admin" className={`hidden text-sm font-medium transition md:block ${isActive('/admin')}`}>
                Add Product
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex items-center justify-center rounded-lg bg-slate-800 p-2 text-gray-400 hover:bg-slate-700 hover:text-white transition"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleCurrency}
            className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700 hover:text-white transition"
            title="Switch Currency"
          >
            <Globe className="h-3 w-3" />
            {currency}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <div className="hidden text-xs font-semibold text-green-400 sm:block">
                  <span className="opacity-75">Admin: </span>
                  <span className="uppercase tracking-wider">Active</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-gray-400 transition hover:bg-slate-700 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-gray-400 transition hover:bg-slate-700 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}

          <Link
            to="/cart"
            className="group relative flex items-center justify-center rounded-full bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-950">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      
      {/* Mobile Nav Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-3 shadow-xl">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className={`block text-base font-medium ${isActive('/')}`}>Shop</Link>
          <Link to="/contact" onClick={() => setIsMenuOpen(false)} className={`block text-base font-medium ${isActive('/contact')}`}>Contact</Link>
          <Link to="/pricing" onClick={() => setIsMenuOpen(false)} className={`block text-base font-medium ${isActive('/pricing')}`}>Pricing</Link>
          
          {isAuthenticated && (
            <Link to="/developer-panel" onClick={() => setIsMenuOpen(false)} className={`block text-base font-medium ${isActive('/developer-panel')}`}>Developer Panel</Link>
          )}

          {isAdmin && (
            <>
              <Link to="/admin-dashboard" onClick={() => setIsMenuOpen(false)} className={`block text-base font-medium ${isActive('/admin-dashboard')}`}>Dashboard</Link>
              <Link to="/admin" onClick={() => setIsMenuOpen(false)} className={`block text-base font-medium ${isActive('/admin')}`}>Add Product</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
