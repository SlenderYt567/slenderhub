import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ProductVariant } from '../types';
import { ShoppingCart, ArrowLeft, ShieldCheck, Zap, Package, Minus, Plus, CreditCard, Check } from 'lucide-react';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, getProductDetail, addToCart, formatPrice, currency, isVariantSoldOut } = useStore();
  
  const [product, setProduct] = useState(products.find(p => p.id === id));
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    const found = products.find(p => p.id === id);
    setProduct(found);
    // Select first AVAILABLE variant by default (skip sold out ones)
    if (found?.variants && found.variants.length > 0) {
        const firstAvailable = found.variants.find(v => !isVariantSoldOut(v)) ?? found.variants[0];
        setSelectedVariantId(firstAvailable.id);
    }

    // A listagem não traz a coluna image (payload ~6MB de base64):
    // busca o produto completo on-demand para exibir a imagem corretamente.
    if (!found?.image) {
      getProductDetail(id!).then(detail => {
        if (detail) setProduct(prev => prev ? { ...prev, ...detail } : detail);
      });
    }
  }, [id, products, getProductDetail, isVariantSoldOut]);

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

  const currentVariant = getSelectedVariant();
  const currentPrice = currentVariant ? currentVariant.price : product.price;

  // Disponibilidade: produto inteiro esgotado OU variante selecionada esgotada
  const productSoldOut = product.stock <= 0;
  const allVariantsSoldOut = product.variants && product.variants.length > 0
    ? product.variants.every(v => isVariantSoldOut(v))
    : productSoldOut;
  const selectedVariantSoldOut = currentVariant ? isVariantSoldOut(currentVariant) : productSoldOut;
  const soldOut = allVariantsSoldOut || selectedVariantSoldOut;

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
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 aspect-[4/3] shadow-2xl relative">
              <img
                src={getSelectedVariant()?.image || product.image}
                alt={getSelectedVariant()?.name || product.title}
                className="h-full w-full object-cover transition-opacity duration-300"
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
                {soldOut && (
                    <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-500 ring-1 ring-red-500/40">
                        Esgotado
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
                
                {/* Variant/Plan Selector — agrupado por categoria interna (ex: Gargantuan, Huges, Titanics) */}
                {product.variants && product.variants.length > 0 && (() => {
                    const grouped = product.variants!.reduce<Record<string, ProductVariant[]>>((acc, v) => {
                        const key = v.category?.trim() || 'Items';
                        (acc[key] = acc[key] || []).push(v);
                        return acc;
                    }, {});
                    const catColor = (cat: string) => {
                        const c = cat.toLowerCase();
                        if (c.includes('gargantuan')) return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
                        if (c.includes('huge')) return 'border-green-500/40 bg-green-500/10 text-green-300';
                        if (c.includes('titanic')) return 'border-red-500/40 bg-red-500/10 text-red-300';
                        return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
                    };
                    return Object.entries(grouped).map(([cat, list]) => (
                        <div key={cat} className="mb-4">
                            <div className={`mb-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${catColor(cat)}`}>
                                {cat}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {list.map((variant) => (
                                    <button 
                                        key={variant.id}
                                        onClick={() => setSelectedVariantId(variant.id)}
                                        disabled={isVariantSoldOut(variant)}
                                        className={`relative flex items-center justify-between rounded-xl border p-4 text-left transition overflow-hidden group ${
                                            isVariantSoldOut(variant)
                                            ? 'border-slate-800/50 bg-slate-900/50 opacity-60 cursor-not-allowed grayscale'
                                            : selectedVariantId === variant.id 
                                            ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500' 
                                            : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                                        }`}
                                    >
                                        {/* Optional Variant Background Image blur */}
                                        {variant.image && (
                                            <div 
                                              className="absolute inset-0 opacity-10 bg-cover bg-center transition-opacity group-hover:opacity-20"
                                              style={{ backgroundImage: `url(${variant.image})` }}
                                            />
                                        )}

                                        {isVariantSoldOut(variant) && (
                                            <span className="absolute right-3 top-3 z-20 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/40">
                                                Esgotado
                                            </span>
                                        )}

                                        <div className="flex items-center gap-3 relative z-10 w-full">
                                            {variant.image && (
                                                <img src={variant.image} alt={variant.name} className="w-12 h-12 rounded-lg object-cover bg-slate-950 border border-slate-800 shadow-sm shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{variant.name}</div>
                                                <div className="text-xs text-blue-400">{formatPrice(variant.price)}</div>
                                            </div>
                                            {selectedVariantId === variant.id && (
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shrink-0 ml-2">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ));
                })()}

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
                    disabled={soldOut}
                    className={`flex-1 rounded-xl px-8 py-4 text-base font-bold transition ${soldOut ? 'cursor-not-allowed bg-slate-800 text-gray-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 hover:translate-y-[-2px]'}`}
                >
                    {soldOut ? 'Esgotado' : 'Buy Now'}
                </button>
                <button 
                    onClick={handleAddToCart}
                    disabled={soldOut}
                    className={`flex-1 rounded-xl border px-8 py-4 text-base font-bold transition ${soldOut ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-gray-500' : 'border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:translate-y-[-2px]'}`}
                >
                    {soldOut ? 'Esgotado' : 'Add to Cart'}
                </button>
            </div>

            {soldOut && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                    Este produto está esgotado no momento. Fale conosco no Discord para saber quando haverá reposição.
                </div>
            )}

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
