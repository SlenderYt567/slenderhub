import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import DeveloperPanel from './pages/DeveloperPanel';
import Documentation from './pages/Documentation';
import Maintenance from './pages/Maintenance';
import UnlockKey from './pages/UnlockKey';
import GatewayVerify from './pages/GatewayVerify';
import Pricing from './pages/Pricing';
import ScriptManager from './pages/ScriptManager';
import ClaimKey from './pages/ClaimKey';
import Scripts from './pages/Scripts';
import Disabled from './pages/Disabled';
import { StoreProvider } from './store';

const PAYPAL_CLIENT_ID = '';

function App() {
  return (
    <StoreProvider>
      <Router>
        <div className="flex min-h-screen flex-col bg-slate-950 text-white selection:bg-blue-500/30 selection:text-blue-200">
          <Navbar />
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
              
              {/* Páginas do Sistema de Chaves/Script (DESATIVADAS - Loja agora vende Gamepasses, Itens e Robux) */}
              <Route path="/developer-panel" element={<Disabled title="Painel de Desenvolvedor indisponível" message="O sistema de chaves/scripts foi descontinuado. A loja agora vende Gamepasses, Itens e Robux oficiais do Roblox." />} />
              <Route path="/script-manager" element={<Disabled title="Gerenciador de Scripts indisponível" message="O sistema de scripts foi descontinuado. A loja agora vende Gamepasses, Itens e Robux oficiais do Roblox." />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/unlock/:key" element={<Disabled title="Sistema de Chaves descontinuado" message="Não trabalhamos mais com chaves de script. Compre Gamepasses, Itens e Robux na nossa <a href='/' className='text-blue-400 underline'>loja principal</a>." />} />
              <Route path="/claim" element={<Disabled title="Sistema de Claims descontinuado" message="Não trabalhamos mais com chaves de script. Compre Gamepasses, Itens e Robux na nossa <a href='/' className='text-blue-400 underline'>loja principal</a>." />} />
              <Route path="/verify-gateway" element={<Disabled title="Gateway descontinuado" message="O sistema de gateway para chaves foi descontinuado. Compre Gamepasses, Itens e Robux na nossa <a href='/' className='text-blue-400 underline'>loja principal</a>." />} />
              <Route path="/pricing" element={<Disabled title="Planos indisponíveis" message="Não oferecemos mais planos de scripts. Compre Gamepasses, Itens e Robux na nossa <a href='/' className='text-blue-400 underline'>loja principal</a>." />} />
              <Route path="/scripts" element={<Scripts />} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <footer className="border-t border-slate-900 bg-[#020617] py-8 text-center text-sm text-gray-600">
            <div className="mx-auto max-w-7xl px-4">
              <p>&copy; {new Date().getFullYear()} Slender Hub. All rights reserved.</p>
              <p className="mt-2 text-xs">Not affiliated with Roblox Corporation.</p>
              <div className="mt-4 flex justify-center gap-4">
                <a href="#" className="hover:text-blue-500">Terms of Service</a>
                <a href="#" className="hover:text-blue-500">Privacy Policy</a>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </StoreProvider>
  );
}

export default App;
