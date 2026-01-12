import React, { useState, useMemo } from 'react';
import { Search, Filter, Rocket, Shield, Terminal } from 'lucide-react';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';

const Home: React.FC = () => {
  const { products } = useStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically calculate unique categories from products
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>(products.map(p => p.category));
    // Ensure 'script', 'item', 'premium' are always first if they exist, purely for visual consistency,
    // but append any new custom ones.
    const defaultOrder = ['script', 'item', 'premium'];
    const sorted = Array.from(categories).sort((a, b) => {
        const idxA = defaultOrder.indexOf(a);
        const idxB = defaultOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });
    return ['all', ...sorted];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-[#0B1120] px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/robloxtech/1920/1080')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
        
        <div className="relative mx-auto max-w-7xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-400 backdrop-blur-md">
            <span className="mr-2 flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Slender Hub V2 is Live
          </div>
          <h1 className="mb-6 bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
            Level Up Your <br />
            <span className="text-blue-500">Roblox Experience</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400">
            Premium exploits, OG accounts, and powerful scripts. Instant delivery, 
            secure payments, no key systems. The #1 marketplace for gamers.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-bold text-white transition hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25">
              <Rocket className="h-5 w-5" />
              Browse Products
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-base font-bold text-white backdrop-blur-sm transition hover:bg-slate-800">
              <Terminal className="h-5 w-5" />
              Get Scripts
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="sticky top-16 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                {uniqueCategories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            activeCategory === cat
                                ? 'bg-white text-slate-950 shadow-md'
                                : 'bg-slate-900 text-gray-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        {cat === 'all' ? 'All Products' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search for scripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
                />
            </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Latest Arrivals</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                {filteredProducts.length} items found
            </div>
        </div>
        
        {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-slate-900 p-6 mb-4">
                    <Filter className="h-12 w-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white">No products found</h3>
                <p className="text-gray-500">Try adjusting your filters or search query.</p>
            </div>
        )}
      </main>

      {/* Features / Trust Section */}
      <section className="border-t border-slate-800 bg-slate-900 py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Rocket className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">Instant Delivery</h3>
                <p className="text-sm text-gray-400">Get your scripts and accounts immediately after purchase via email.</p>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <Shield className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">Secure & Safe</h3>
                <p className="text-sm text-gray-400">All products are verified. We prioritize account safety and anonymity.</p>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                    <Terminal className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">Premium Scripts</h3>
                <p className="text-sm text-gray-400">High-quality, updated scripts for the most popular Roblox games.</p>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
