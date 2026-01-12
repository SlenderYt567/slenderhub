import React from 'react';
import { useStore } from '../store';
import { Trash2, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const { cart, removeFromCart, totalCartValue, formatPrice, isAuthenticated } = useStore();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full bg-slate-900 p-8">
          <CreditCard className="h-16 w-16 text-slate-700" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">Your cart is empty</h2>
          <p className="mt-2 text-gray-400">Looks like you haven't added any scripts or items yet.</p>
        </div>
        <Link
          to="/"
          className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-white">Shopping Cart</h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Cart Items List */}
        <div className="lg:col-span-8">
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-24 w-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link to={`/product/${item.id}`} className="hover:text-blue-400 transition">
                        <h3 className="text-lg font-bold text-white">{item.title}</h3>
                      </Link>
                      <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-xs text-gray-400 capitalize mt-1">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-blue-400">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                    <span>Qty: {item.quantity}</span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-6 text-xl font-bold text-white">Order Summary</h2>

            <div className="space-y-4 border-b border-slate-800 pb-6">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="text-white">{formatPrice(totalCartValue)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Processing Fee</span>
                <span className="text-white">{formatPrice(0)}</span>
              </div>
            </div>

            <div className="mt-6 mb-8 flex justify-between text-xl font-bold">
              <span className="text-white">Total</span>
              <span className="text-blue-400">{formatPrice(totalCartValue)}</span>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    navigate('/checkout');
                  } else {
                    navigate('/login');
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white transition hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25"
              >
                Proceed to Payment <ArrowRight className="h-5 w-5" />
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-2">
                <ShieldCheck className="h-4 w-4" />
                Secure SSL Encrypted Payment
              </div>
            </div>

            {/* Payment Methods (Visual) */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-xs text-gray-500 mb-3 text-center">We accept</p>
              <div className="flex justify-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="h-8 w-12 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold">PIX</div>
                <div className="h-8 w-12 rounded bg-white/10" title="Visa"></div>
                <div className="h-8 w-12 rounded bg-white/10" title="Mastercard"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
