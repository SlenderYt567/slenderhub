import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Key, Shield, Check, ArrowRight, Star, Crown, Sparkles } from 'lucide-react';
import { useStore } from '../store';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Try it for free',
    icon: Key,
    iconColor: 'text-gray-400',
    iconBg: 'bg-gray-500/10',
    borderAccent: 'border-slate-700',
    hoverBorder: 'hover:border-slate-500',
    priceUSD: 0,
    priceBRL: 0,
    keyLimit: 5,
    maxDuration: '1 Dia',
    badge: null,
    features: [
      '5 keys total',
      'Max duration 1 day',
      'Basic gateway',
      'Support via Discord',
    ],
    disabledFeatures: [
      'Dynamic Linkvertise',
      'Discord + YouTube gateway',
      'Priority support',
    ],
    cta: 'Get Started Free',
    ctaStyle: 'bg-slate-800 hover:bg-slate-700 text-white',
    popular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    subtitle: 'For those getting started',
    icon: Zap,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    borderAccent: 'border-slate-700',
    hoverBorder: 'hover:border-blue-500/50',
    priceUSD: 5.9,
    priceBRL: 35,
    keyLimit: 50,
    maxDuration: '30 Dias',
    badge: null,
    features: [
      '50 keys total',
      'Max duration 30 days',
      'Gateway with Linkvertise',
      'Required Discord + YouTube',
      'Support via Discord',
    ],
    disabledFeatures: [
      'Priority support',
    ],
    cta: 'Buy Basic',
    ctaStyle: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'For popular scripts',
    icon: Star,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10',
    borderAccent: 'border-indigo-500/40',
    hoverBorder: 'hover:border-indigo-400/60',
    priceUSD: 14.9,
    priceBRL: 90,
    keyLimit: 500,
    maxDuration: 'Lifetime',
    badge: '🔥 Mais Popular',
    features: [
      '500 keys total',
      'Lifetime duration',
      'Dynamic Linkvertise gateway',
      'Required Discord + YouTube',
      'Custom key prefix',
      'Priority support',
    ],
    disabledFeatures: [],
    cta: 'Buy Pro',
    ctaStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30',
    popular: true,
  },
  {
    id: 'infinity',
    name: 'Infinity',
    subtitle: 'For professional hubs',
    icon: Crown,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    borderAccent: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400/50',
    priceUSD: 29.9,
    priceBRL: 180,
    keyLimit: null,
    maxDuration: 'Lifetime',
    badge: '👑 Elite',
    features: [
      'UNLIMITED keys',
      'Lifetime duration',
      'All Pro features included',
      'Early access to new features',
      'VIP 1-on-1 support',
      'Exclusive Discord badge',
    ],
    disabledFeatures: [],
    cta: 'Buy Infinity',
    ctaStyle: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30',
    popular: false,
  },
];

const Pricing: React.FC = () => {
  const { isAuthenticated, addToCart, clearCart } = useStore();
  const navigate = useNavigate();
  const [billing] = useState<'brl' | 'usd'>('brl');

  const handleBuy = (plan: typeof plans[0]) => {
    if (plan.priceUSD === 0) {
      if (!isAuthenticated) navigate('/login');
      else navigate('/developer-panel');
      return;
    }

    // Always add USD price to cart — the checkout/store handles conversion to BRL display
    clearCart();
    addToCart({
      id: `plan-${plan.id}`,
      title: `SlenderKey ${plan.name}`,
      description: `${plan.keyLimit === null ? 'Unlimited' : plan.keyLimit} keys — ${plan.maxDuration}`,
      price: plan.priceUSD,
      image: '',
      category: 'SlenderKey Plan',
      stock: 999,
      featured: false,
    }, 1);

    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24 pb-16 px-4 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-indigo-600/8 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-sm font-semibold text-blue-400 mb-6">
            <Sparkles className="w-4 h-4" />
            SlenderKey — Licensing System
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            Monetize your{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Roblox Script
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Protect and monetize your hub with SlenderKey. Manage license keys with shortener gateways, social verification, and much more.
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billing === 'brl' ? plan.priceBRL : plan.priceUSD;
            const priceCurrency = billing === 'brl' ? 'BRL' : 'USD';
            const pricePrefix = billing === 'brl' ? 'R$' : '$';

            return (
              <div
                key={plan.id}
                className={`group relative rounded-3xl border ${plan.borderAccent} ${plan.hoverBorder} bg-slate-900/40 backdrop-blur-xl transition-all duration-300 overflow-hidden ${plan.popular ? 'ring-1 ring-indigo-500/30 shadow-xl shadow-indigo-500/10' : ''}`}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="rounded-[22px] bg-slate-950 p-6">
                  {/* Icon & Name */}
                  <div className={`w-12 h-12 ${plan.iconBg} rounded-2xl flex items-center justify-center mb-4 border border-slate-800`}>
                    <Icon className={`w-6 h-6 ${plan.iconColor}`} />
                  </div>

                  <h2 className="text-xl font-black mb-1">{plan.name}</h2>
                  <p className="text-xs text-gray-500 mb-5">{plan.subtitle}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {price === 0 ? (
                      <div className="text-4xl font-black text-white">Grátis</div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-gray-400">{pricePrefix}</span>
                        <span className="text-4xl font-black text-white">
                          {price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">{priceCurrency}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">one-time payment</p>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-sm rounded-xl bg-slate-900 px-3 py-2">
                      <span className="text-gray-400">Keys</span>
                      <span className="font-bold text-white">
                        {plan.keyLimit === null ? '∞ Unlimited' : plan.keyLimit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm rounded-xl bg-slate-900 px-3 py-2">
                      <span className="text-gray-400">Max Duration</span>
                      <span className="font-bold text-white">{plan.maxDuration}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-gray-300">{f}</span>
                      </div>
                    ))}
                    {plan.disabledFeatures.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm opacity-35">
                        <Check className="w-4 h-4 text-gray-600 mt-0.5 shrink-0" />
                        <span className="text-gray-500 line-through">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleBuy(plan)}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 ${plan.ctaStyle}`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm text-center">
          <Shield className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">How does activation work?</h3>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xl mx-auto">
            After payment, join the SlenderHub Discord and send your proof. Your plan is manually activated within <strong className="text-white">24 hours</strong>. PIX payments are the fastest!
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <a
              href="https://discord.gg/2B8TQ7A3MV"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-5 py-2.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 transition"
            >
              Join Discord
            </a>
            <Link
              to="/documentation"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-slate-700 transition"
            >
              View Documentation
            </Link>
          </div>
        </div>

        {/* FAQ minimal */}
        <div className="mt-10 max-w-2xl mx-auto space-y-4">
          <h2 className="text-center text-2xl font-black mb-6">Frequently Asked Questions</h2>
          {[
            {
              q: 'Is the Starter plan really free?',
              a: 'Yes! When you create your account, you already have access to the Starter plan with 5 keys of up to 1 day validity to test the system.'
            },
            {
              q: 'Can I upgrade my plan later?',
              a: 'Yes! Contact us on Discord and the upgrade process is done by paying the difference between plans.'
            },
            {
              q: 'Is the payment recurring?',
              a: 'No. All plans are one-time payments. Once purchased, it is yours forever — no monthly fees.'
            },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="font-bold text-white mb-2">{item.q}</h3>
              <p className="text-sm text-gray-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
