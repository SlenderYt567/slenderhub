import React, { useState } from 'react';
import { Check, ExternalLink, Info, Shield, Sparkles, Truck, RotateCcw, MessageSquare, ShoppingCart, Coins, Gem } from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'buy' | 'delivery' | 'support' | 'faq'>('buy');

  const tabs = [
    { id: 'buy', label: 'How to Buy', icon: ShoppingCart },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'support', label: 'Support', icon: MessageSquare },
    { id: 'faq', label: 'FAQ', icon: Info },
  ];

  const stepsBuy = [
    {
      number: 1,
      title: 'Choose Your Product',
      description: 'Browse our store and select the gamepass, item, or Robux amount you want.',
      icon: Sparkles,
    },
    {
      number: 2,
      title: 'Add to Cart',
      description: 'Click "Add to Cart" and review your order. You can add multiple items.',
      icon: ShoppingCart,
    },
    {
      number: 3,
      title: 'Complete Payment',
      description: 'Choose between PIX, Credit Card, PayPal, or Crypto. PIX payments are approved instantly.',
      icon: Check,
    },
    {
      number: 4,
      title: 'Receive Instantly',
      description: 'After confirmation, delivery is automatic. Gamepasses and items go directly to your Roblox account.',
      icon: Truck,
    },
  ];

  const faqItems = [
    {
      question: 'Is delivery really instant?',
      answer: 'Yes! For PIX and crypto payments, approval takes seconds and delivery is automatic. Credit cards may take a few minutes for bank approval.',
    },
    {
      question: 'Do I need to provide my Roblox password?',
      answer: 'NEVER. Delivery is done via official Roblox systems (Gamepass/Developer Products) or Robux transfer via group. We only need your Roblox username.',
    },
    {
      question: 'Is it safe to buy here?',
      answer: 'Absolutely. We use certified payment gateways (Mercado Pago, Stripe, PayPal). Your financial data never passes through our servers. We have SSL/TLS on all pages.',
    },
    {
      question: 'What if I don\'t receive my item?',
      answer: 'Full delivery guarantee or your money back. Our 24/7 support resolves issues in minutes. Just open a ticket with your order number.',
    },
    {
      question: 'Can I buy for a friend?',
      answer: 'Yes! At checkout, just provide the Roblox username of the recipient. Delivery goes directly to the specified account.',
    },
    {
      question: 'Do you sell accounts or exploits?',
      answer: 'No. We only sell official gamepasses, Roblox catalog items, and Robux via official methods. We do not work with exploits, scripts, accounts, or anything that violates Roblox TOS.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] px-4 pb-12 pt-24 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12">
          <Link to="/" className="mb-4 inline-block text-blue-400 hover:underline flex items-center gap-1">
            <RotateCcw className="h-4 w-4" />
            Back to Store
          </Link>
          <h1 className="mb-4 text-4xl font-black">
            HELP <span className="text-purple-500">CENTER</span>
          </h1>
          <p className="text-gray-400">
            Everything you need to know to buy gamepasses, items, and Robux safely and quickly.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-slate-800">
          <nav className="flex gap-1 overflow-x-auto pb-2" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`whitespace-nowrap flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'bg-slate-900 text-gray-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {activeTab === 'buy' && (
            <>
              <div className="mb-8 flex items-start space-x-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-6">
                <Info className="mt-1 h-6 w-6 shrink-0 text-purple-400" />
                <div>
                  <h3 className="font-bold text-purple-100">Before You Start</h3>
                  <p className="text-sm text-purple-300 mt-1">
                    Have your <strong>Roblox username</strong> ready (not your password!). For Robux, you\'ll need to join the
                    official Slender Hub group on Roblox to receive the transfer.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {stepsBuy.map((step) => (
                  <div key={step.number} className="flex gap-4">
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-bold text-white">
                      {step.number}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <step.icon className="h-5 w-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">{step.title}</h3>
                      </div>
                      <p className="ml-7 mt-2 text-gray-400">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-bold text-green-300">100% Automatic and Secure Delivery</h3>
                </div>
                <p className="text-gray-300">
                  After payment confirmation, our systems process delivery instantly:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="mb-3 flex items-center gap-2 text-blue-400">
                    <Sparkles className="h-5 w-5" />
                    <h4 className="font-bold">Gamepasses</h4>
                  </div>
                  <p className="text-sm text-gray-400">Delivered via official Roblox Developer Product. You receive an in-game notification and the gamepass appears in your inventory.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="mb-3 flex items-center gap-2 text-yellow-400">
                    <Coins className="h-5 w-5" />
                    <h4 className="font-bold">Robux</h4>
                  </div>
                  <p className="text-sm text-gray-400">Transferred via official Roblox group (Payout). You join the group, accept the payout, and Robux arrive in your account within 3 days (Roblox policy).</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="mb-3 flex items-center gap-2 text-pink-400">
                    <Gem className="h-5 w-5" />
                    <h4 className="font-bold">Exclusive Items</h4>
                  </div>
                  <p className="text-sm text-gray-400">Catalog items are purchased by us and sent via Roblox trading/gifting system. You receive a notification to accept.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-amber-400" />
                  <h4 className="font-bold text-amber-300">Important About Robux</h4>
                </div>
                <p className="text-sm text-amber-200">
                  Due to Roblox policy, group payments (Payouts) can take <strong>up to 72 hours</strong> to arrive.
                  Gamepasses and items are instant. "Pending" status in the group is normal.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-blue-300">24/7 Support</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Our team is available 24 hours a day, 7 days a week to help with any questions or issues.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link to="/contact" className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-blue-500/50 transition-colors">
                    <MessageSquare className="h-6 w-6 text-blue-400" />
                    <div>
                      <h4 className="font-bold text-white">Open Ticket</h4>
                      <p className="text-xs text-gray-400">Response within 5 minutes</p>
                    </div>
                  </Link>
                  <a href="https://discord.gg/slenderhub" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-purple-500/50 transition-colors">
                    <ExternalLink className="h-6 w-6 text-purple-400" />
                    <div>
                      <h4 className="font-bold text-white">Discord</h4>
                      <p className="text-xs text-gray-400">Community and quick support</p>
                    </div>
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h4 className="font-bold text-white mb-4">Information for the Ticket</h4>
                <p className="text-sm text-gray-400 mb-4">For faster assistance, include:</p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Order number (e.g., #SLH-12345)</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Roblox username used for purchase</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Payment proof screenshot (if applicable)</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Issue description</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <details key={index} className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <h4 className="font-semibold text-white pr-4">{item.question}</h4>
                    <RotateCcw className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${'group-open:rotate-180'}`} />
                  </summary>
                  <div className="mt-4 pt-4 border-t border-slate-800 text-gray-300 text-sm leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 border-t border-slate-800 pt-12 text-center">
          <p className="mb-6 italic text-gray-500">Didn\'t find your answer? Our team is ready to help.</p>
          <Link
            to="/contact"
            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 font-bold transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Documentation;