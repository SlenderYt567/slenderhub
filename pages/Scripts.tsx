import React from 'react';
import { ShoppingCart, Star, Sparkles, Gem, Coins, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Scripts: React.FC = () => {
  const categories = [
    {
      icon: Gem,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      title: 'Gamepasses',
      description: 'Official gamepasses for Blox Fruits, Adopt Me, Pet Simulator, and more.',
      items: ['2x XP', 'Auto Farm', 'VIP Access', 'Private Server'],
    },
    {
      icon: Coins,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      title: 'Robux',
      description: 'Robux directly to your account with instant and secure delivery.',
      items: ['800 Robux', '1,700 Robux', '4,500 Robux', '10,000 Robux'],
    },
    {
      icon: Sparkles,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
      title: 'Exclusive Items',
      description: 'Rare items, pets, skins, and accessories for your avatar.',
      items: ['Legendary Pets', 'Rare Skins', 'Accessories', 'Exclusive Emotes'],
    },
    {
      icon: Shield,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      title: 'Total Guarantee',
      description: 'Guaranteed delivery or your money back. 24/7 support.',
      items: ['Instant Delivery', 'Priority Support', 'Easy Refund', 'Account Safety'],
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0A0A] flex flex-col items-center justify-center py-20 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center z-10">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
          Complete <span className="text-purple-500">Roblox</span> Store
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Gamepasses, Robux, exclusive items, and more. Instant delivery, secure payments, and 24/7 support. 
          The best way to level up in your favorite games.
        </p>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
          {categories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <Link
                key={index}
                to="/shop"
                className={`group relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] ${cat.bgColor} ${cat.borderColor}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${cat.bgColor} ${cat.color}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{cat.title}</h3>
                <p className="text-gray-400 text-sm mb-4 flex-1">{cat.description}</p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {cat.items.map((item, i) => (
                    <span key={i} className="px-2.5 py-1 text-xs bg-[#111] border border-[#222] rounded text-gray-300">
                      {item}
                    </span>
                  ))}
                </div>
                <span className="flex items-center justify-center gap-2 text-sm font-semibold self-start mt-auto {cat.color} group-hover:text-white transition-colors">
                  View Catalog <Sparkles className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-12">
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <Shield className="h-8 w-8 text-green-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">100%</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Guaranteed Delivery</p>
          </div>
          
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <ShoppingCart className="h-8 w-8 text-purple-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">+15K</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Orders Delivered</p>
          </div>
          
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <Star className="h-8 w-8 text-yellow-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">+8K</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Happy Customers</p>
          </div>
          
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <Sparkles className="h-8 w-8 text-pink-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">4.9</h3>
            <div className="flex gap-0.5 mt-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Average Rating</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16">
          <Link 
            to="/shop" 
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-105"
          >
            <ShoppingCart className="h-5 w-5" />
            Explore Full Store
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Scripts;