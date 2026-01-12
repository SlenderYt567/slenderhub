import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
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
import { StoreProvider } from './store';

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
