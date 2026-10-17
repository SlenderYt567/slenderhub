import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Product, ProductVariant } from '../types';
import { ShoppingCart, ArrowLeft, ShieldCheck, Zap, Package, Minus, Plus, CreditCard, Check, Star, Headset, ChevronRight } from 'lucide-react';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemType = searchParams.get('tipo');
  const { getProductDetail, addToCart, formatPrice, currency, isVariantSoldOut } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingProduct(true);
    setLoadError('');
    setQuantity(1);
    getProductDetail(id!).then(detail => {
      if (cancelled) return;
      setProduct(detail);
      const matchingVariants = itemType && detail?.category.toLowerCase() !== itemType.toLowerCase()
        ? detail?.variants?.filter(v => v.category?.toLowerCase() === itemType.toLowerCase())
        : detail?.variants;
      const available = matchingVariants?.find(v => !isVariantSoldOut(v)) ?? matchingVariants?.[0]
        ?? detail?.variants?.find(v => !isVariantSoldOut(v)) ?? detail?.variants?.[0];
      setSelectedVariantId(available?.id ?? null);
    }).catch(() => {
      if (!cancelled) setLoadError('Não foi possível carregar o produto. Atualize a página para tentar novamente.');
    }).finally(() => {
      if (!cancelled) setLoadingProduct(false);
    });
    return () => { cancelled = true; };
  }, [id, itemType, getProductDetail, isVariantSoldOut]);

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-[#070914] flex flex-col items-center justify-center py-20 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-gray-400">Carregando produto…</p>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="min-h-screen bg-[#070914] flex flex-col items-center justify-center gap-4 text-center px-4 py-20 text-white">
        <h2 className="text-2xl font-black">Produto não encontrado</h2>
        <p className="text-sm text-gray-400">{loadError || 'O produto solicitado não foi localizado em nossa base.'}</p>
        <Link to="/" className="mt-2 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition">
          <ArrowLeft className="h-4 w-4" /> Voltar para a Loja
        </Link>
      </div>
    );
  }

  const getSelectedVariant = () => {
    if (!product.variants) return null;
    return product.variants.find(v => v.id === selectedVariantId) || null;
  };

  const matchingTypeVariants = itemType && product.category.toLowerCase() !== itemType.toLowerCase()
    ? product.variants?.filter(v => v.category?.toLowerCase() === itemType.toLowerCase())
    : null;
  const visibleVariants = matchingTypeVariants?.length ? matchingTypeVariants : product.variants;

  const currentVariant = getSelectedVariant();
  const currentPrice = currentVariant ? currentVariant.price : product.price;

  const productSoldOut = product.stock <= 0;
  const allVariantsSoldOut = product.variants && product.variants.length > 0
    ? product.variants.every(v => isVariantSoldOut(v))
    : productSoldOut;
  const selectedVariantSoldOut = currentVariant ? isVariantSoldOut(currentVariant) : productSoldOut;
  const soldOut = productSoldOut || allVariantsSoldOut || selectedVariantSoldOut;
  const maxQuantity = Math.min(product.stock, currentVariant?.stock ?? product.stock);

  const handleAddToCart = () => {
    addToCart(product, quantity, getSelectedVariant());
  };

  const handleBuyNow = () => {
    if (addToCart(product, quantity, getSelectedVariant())) {
      navigate('/checkout');
    }
  };

  // Gallery images array
  const galleryImages = [...new Set([
    currentVariant?.image || product.image,
    product.image,
    ...(product.variants || []).map(variant => variant.image),
  ].filter((image): image is string => Boolean(image)))];

  const displayedImage = galleryImages[activeImageIndex] || product.image;

  return (
    <div className="min-h-screen bg-[#070914] text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* BREADCRUMB MATCHING IMAGE 1 */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-gray-400">
          <Link to="/" className="hover:text-purple-300 transition">Shop</Link>
          <ChevronRight className="h-3 w-3 text-gray-600" />
          <span className="text-gray-300">{product.category}</span>
          <ChevronRight className="h-3 w-3 text-gray-600" />
          <span className="text-purple-400 font-semibold truncate">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">

          {/* LEFT COLUMN: IMAGES & THUMBNAILS */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Big Main Image Container */}
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-purple-900/50 bg-[#0d1029] shadow-2xl shadow-purple-950/40 group">
              <img
                src={displayedImage}
                alt={product.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070914]/80 via-transparent to-transparent pointer-events-none" />

              {soldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                  <span className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/40">
                    Esgotado
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery Row */}
            <div className="flex items-center gap-3">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-square w-20 overflow-hidden rounded-xl border transition-all ${
                    activeImageIndex === idx
                      ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-md scale-105'
                      : 'border-purple-950/60 bg-[#0c0f26] opacity-60 hover:opacity-100 hover:border-purple-700'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: PRODUCT INFO & VARIATIONS */}
          <div className="lg:col-span-7 flex flex-col">

            {/* Product category */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="rounded-md bg-purple-600/20 border border-purple-500/40 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-purple-300">
                {product.category || 'Item Roblox'}
              </span>
              {product.game_name && <span className="text-xs text-purple-300">{product.game_name}</span>}
            </div>

            {/* Product Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {product.title}
            </h1>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {formatPrice(currentPrice)}
              </span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{currency}</span>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm text-gray-300/90 leading-relaxed font-normal whitespace-pre-line">
              {product.short_description || product.description}
            </p>

            {/* Product information entered by the store administrator */}
            <div className="mt-5 rounded-2xl border border-purple-950/70 bg-[#0e122b]/80 p-4 backdrop-blur-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2.5">
                Detalhes e entrega
              </h4>
              {product.short_description && <p className="mb-3 whitespace-pre-line text-xs leading-relaxed text-gray-300">{product.description}</p>}
              <p className="flex items-center gap-2 text-xs text-gray-300">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {product.delivery_mode === 'digital' ? 'Entrega digital após confirmação do pagamento' : 'Entrega manual combinada após confirmação do pagamento'}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="mt-6 flex items-center gap-4">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Quantidade</span>
              <div className="flex items-center rounded-xl border border-purple-900/50 bg-[#0e122b]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-9 w-9 items-center justify-center text-gray-400 hover:text-white transition"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="w-10 text-center text-sm font-bold text-white">{quantity}</div>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={soldOut || quantity >= maxQuantity}
                  className="flex h-9 w-9 items-center justify-center text-gray-400 hover:text-white transition disabled:opacity-30"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBuyNow}
                disabled={soldOut}
                className={`flex-1 rounded-xl py-3.5 px-6 text-sm font-bold transition shadow-xl ${
                  soldOut
                    ? 'cursor-not-allowed bg-slate-800 text-gray-500'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {soldOut ? 'Esgotado' : 'Comprar agora'}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={soldOut}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 px-6 text-sm font-bold transition ${
                  soldOut
                    ? 'cursor-not-allowed border-purple-950 bg-slate-900 text-gray-500'
                    : 'border-purple-800/60 bg-[#0e122b] text-purple-200 hover:border-purple-500 hover:bg-[#151a3d] hover:text-white'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                Adicionar ao carrinho
              </button>
            </div>

            {/* 3 Trust Mini-Cards Row matching Image 1 */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-purple-950/60 bg-[#0e122b]/60 p-3">
                <Package className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                <div className="text-[11px] font-bold text-white">{product.delivery_mode === 'digital' ? 'Entrega digital' : 'Entrega manual'}</div>
                <div className="text-[10px] text-gray-400">Após confirmação</div>
              </div>
              <div className="rounded-xl border border-purple-950/60 bg-[#0e122b]/60 p-3">
                <CreditCard className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-[11px] font-bold text-white">Pagamento Seguro</div>
                <div className="text-[10px] text-gray-400">Pix e cripto</div>
              </div>
              <div className="rounded-xl border border-purple-950/60 bg-[#0e122b]/60 p-3">
                <Headset className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <div className="text-[11px] font-bold text-white">Suporte</div>
                <div className="text-[10px] text-gray-400">Discord e Email</div>
              </div>
            </div>

            {/* VARIATIONS SELECTOR MATCHING IMAGE 1 */}
            {product.variants && product.variants.length > 0 && (
              <div className="mt-8 border-t border-purple-950/80 pt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                    {matchingTypeVariants?.length ? `${itemType} · ${matchingTypeVariants.length} opções` : 'Escolha uma opção'}
                  </h3>
                  {matchingTypeVariants?.length ? <button type="button" onClick={() => setSearchParams({})}
                    className="text-xs font-bold text-purple-300 hover:text-white">Ver todas as opções</button> : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleVariants?.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    const variantSold = isVariantSoldOut(v);

                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        disabled={variantSold}
                        className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition relative overflow-hidden ${
                          isSelected
                            ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500 shadow-lg shadow-purple-900/20'
                            : 'border-purple-950/80 bg-[#0d1029] hover:border-purple-800 hover:bg-[#12163b]'
                        } ${variantSold ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Variant Thumbnail */}
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-purple-900/50 bg-[#080a1c]">
                            <img
                              src={v.image || product.image}
                              alt={v.name}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">{v.name}</span>
                            {v.category && <span className="text-[10px] text-purple-300">{v.category}</span>}
                            <span className="text-xs font-extrabold text-cyan-400">{formatPrice(v.price)}</span>
                          </div>
                        </div>

                        {/* Selected Checkmark or Sold Out */}
                        {variantSold ? (
                          <span className="text-[10px] font-black uppercase text-red-400">Esgotado</span>
                        ) : isSelected ? (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default ProductDetails;
