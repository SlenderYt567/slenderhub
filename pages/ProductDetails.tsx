import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ShoppingCart, ArrowLeft, ShieldCheck, Zap, Package, Minus, Plus, CreditCard, Check } from 'lucide-react';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, formatPrice, currency } = useStore();
  
  const [product, setProduct] = useState(products.find(p => p.id === id));
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    const found = products.find(p => p.id === id);
    setProduct(found);
    // Select first variant by default if exists
    if (found?.variants && found.variants.length > 0) {
        setSelectedVariantId(found.variants[0].id);
    }
  }, [id, products]);

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-white">Product Not Found</h2>
        <Link to="/" className="text-blue-500 hover:underline">Return Home</Link>
      </div>
    );
  }

  const getSelectedVariant = () => {
      if (!product.variants) return null;
      return product.variants.find(v => v.id === selectedVariantId);
  };

  const currentPrice = getSelectedVariant() ? getSelectedVariant()!.price : product.price;

  const handleAddToCart = () => {
    addToCart(product, quantity, getSelectedVariant());
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, getSelectedVariant());
    navigate('/checkout');
  };

  const categoryColorClass = () => {
      const cat = product.category.toLowerCase();
      if (cat.includes('script')) return 'bg-yellow-500/10 text-yellow-500';
      if (cat.includes('plans')) return 'bg-purple-500/10 text-purple-500';
      return 'bg-blue-500/10 text-blue-500';
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left Column: Images */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 aspect-[4/3] shadow-2xl">
              <img
                src={product.image}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            </div>
            {/* Small thumbnail gallery simulation */}
            <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 w-20 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 opacity-60 hover:opacity-100 cursor-pointer">
                        <img src={product.image} className="h-full w-full object-cover" alt="thumbnail" />
                    </div>
                ))}
            </div>
          </div>

          {/* Right Column: Info & Actions */}
          <div className="flex flex-col">
            <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${categoryColorClass()}`}>
                    {product.category}
                </span>
                {product.featured && (
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-red-500">
                        Hot
                    </span>
                )}
            </div>

            <h1 className="mb-4 text-4xl font-bold text-white">{product.title}</h1>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-400">{formatPrice(currentPrice)}</span>
              <span className="text-sm text-gray-500">{currency}</span>
            </div>

            <p className="mb-8 text-lg text-gray-400 leading-relaxed">
              {product.description}
            </p>
            
            <div className="mb-8 h-px bg-slate-800"></div>

            {/* Selection Controls */}
            <div className="space-y-6">
                
                {/* Variant/Plan Selector */}
                {product.variants && product.variants.length > 0 && (
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Select Plan</label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {product.variants.map((variant) => (
                                <button 
                                    key={variant.id}
                                    onClick={() => setSelectedVariantId(variant.id)}
                                    className={`relative flex items-center justify-between rounded-xl border p-4 text-left transition ${
                                        selectedVariantId === variant.id 
                                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500' 
                                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                                    }`}
                                >
                                    <div>
                                        <div className="text-sm font-bold text-white">{variant.name}</div>
                                        <div className="text-xs text-gray-400">{formatPrice(variant.price)}</div>
                                    </div>
                                    {selectedVariantId === variant.id && (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Quantity</label>
                    <div className="flex w-32 items-center rounded-lg border border-slate-700 bg-slate-900">
                        <button 
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="flex h-10 w-10 items-center justify-center text-gray-400 hover:text-white"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <div className="flex-1 text-center text-white font-bold">{quantity}</div>
                        <button 
                             onClick={() => setQuantity(quantity + 1)}
                             className="flex h-10 w-10 items-center justify-center text-gray-400 hover:text-white"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button 
                    onClick={handleBuyNow}
                    className="flex-1 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 hover:translate-y-[-2px]"
                >
                    Buy Now
                </button>
                <button 
                    onClick={handleAddToCart}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-8 py-4 text-base font-bold text-white transition hover:bg-slate-800 hover:translate-y-[-2px]"
                >
                    Add to Cart
                </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Instant Email Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span>24/7 Support</span>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
