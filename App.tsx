import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import Checkout from './pages/Checkout';
import Contact from './pages/Contact';
import Success from './pages/Success';
import Cancel from './pages/Cancel';
import Maintenance from './pages/Maintenance';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import DeveloperPanel from './pages/DeveloperPanel';
import Documentation from './pages/Documentation';
import { StoreProvider } from './store';

const PAYPAL_CLIENT_ID = 'AdCW0tDanq77aiKHYBeikcyVMfgjcovBf5IB3OLF-y-Et1TeXaAsuVs08NnXPbfn5WAT6eHYv15itizq';

function App() {
  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
      <StoreProvider>
        <Router>
          <div className="flex min-h-screen flex-col bg-slate-950 text-white selection:bg-blue-500/30 selection:text-blue-200">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/add-product" element={<AddProduct />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/success" element={<Success />} />
                <Route path="/cancel" element={<Cancel />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/developer-panel" element={<DeveloperPanel />} />
                <Route path="/documentation" element={<Documentation />} />
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
    </PayPalScriptProvider>
  );
}

export default App;
