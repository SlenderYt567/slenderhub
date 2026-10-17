import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import EditProduct from './pages/EditProduct';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import ChatRoom from './pages/ChatRoom';
import Contact from './pages/Contact';
import Documentation from './pages/Documentation';
import Scripts from './pages/Scripts';
import Disabled from './pages/Disabled';
import { StoreProvider } from './store';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/edit');

  return (
    <div className="flex min-h-screen flex-col bg-[#070914] text-white selection:bg-purple-600/30 selection:text-purple-200">
      {!isAdminRoute && <Navbar />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/edit/:id" element={<EditProduct />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/developer-panel" element={<Disabled title="Painel indisponível" message="O sistema foi unificado para a loja de Itens e Gamepasses Roblox." />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/scripts" element={<Scripts />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {!isAdminRoute && (
        <footer className="border-t border-purple-950/60 bg-[#060816] py-10 text-center text-xs text-gray-400">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px]">
                S
              </div>
              <span className="font-extrabold text-sm tracking-wider text-white">
                SLENDER<span className="text-purple-400">HUB</span>
              </span>
            </div>

            <p className="text-gray-400 max-w-md mx-auto">
              Encontre itens e gamepasses Roblox, acompanhe seu pedido e fale com nossa equipe de suporte.
            </p>

            <div className="flex justify-center gap-6 text-gray-400 pt-2 font-medium">
              <a href="/contact" className="hover:text-purple-400 transition">Central de Suporte</a>
            </div>

            <p className="text-[11px] text-gray-400 pt-4 border-t border-purple-950/40">
              &copy; {new Date().getFullYear()} Slender Hub. Todos os direitos reservados. Não afiliado à Roblox Corporation.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

function App() {
  return (
    <StoreProvider>
      <Router>
        <AppLayout />
      </Router>
    </StoreProvider>
  );
}

export default App;
