import React, { useState } from 'react';
import { ShoppingCart, Package, Trash2, Edit, Eye, Sparkles, Flame, Check } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, isAdmin, deleteProduct, formatPrice, isSoldOut } = useStore();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);

  const soldOut = isSoldOut(product);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.variants?.length) {
      navigate(`/product/${product.id}`);
      return;
    }
    const added = addToCart(product);
    if (added) {
      setAddedAnim(true);
      setTimeout(() => setAddedAnim(false), 1200);
    }
  };

  // Badges matching Image 1
  const renderBadge = () => {
    if (product.is_draft) return <div className="absolute left-3 top-3 z-20 rounded-md bg-slate-700 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">Rascunho</div>;
    if (product.featured) {
      return (
        <div className="absolute left-3 top-3 z-20 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20">
          DESTAQUE
        </div>
      );
    }
    return null;
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-purple-950/70 bg-[#0d1127] transition-all duration-300 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-600/20 hover:-translate-y-1.5">
      {/* Visual Product Box */}
      <Link to={`/product/${product.id}`} className="relative aspect-square w-full overflow-hidden bg-[#090c1f] block">
        {renderBadge()}

        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? 'grayscale opacity-50' : 'opacity-90 group-hover:opacity-100'}`}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#121636] to-[#1c183a] relative">
            <Sparkles className="h-10 w-10 text-purple-400/40" />
          </div>
        )}

        {/* Ambient Glow Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1127] via-transparent to-black/20 pointer-events-none" />

        {/* Sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded-lg bg-red-600 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/40">
              Esgotado
            </span>
          </div>
        )}

        {/* Quick view indicator on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-purple-950/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-purple-600/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md">
            <Eye className="h-3.5 w-3.5" /> Ver Detalhes
          </span>
        </div>
      </Link>

      {/* Product Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Game/Category Mini Tag */}
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-purple-400/80">
          {product.category || 'Roblox Item'}
        </div>

        {/* Title */}
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="line-clamp-1 text-base font-bold text-white group-hover:text-purple-300 transition-colors">
            {product.title}
          </h3>
        </Link>
        {product.short_description && <p className="mt-1 line-clamp-2 text-xs text-gray-400">{product.short_description}</p>}

        {/* Bottom Price and Actions */}
        <div className="mt-4 flex items-end justify-between border-t border-purple-950/60 pt-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-gray-400">A partir de</span>
            {product.original_price != null && product.original_price > product.price && (
              <span className="text-xs text-gray-500 line-through">{formatPrice(product.original_price)}</span>
            )}
            <span className="text-xl font-extrabold text-white tracking-tight">
              {formatPrice(product.price)}
            </span>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <Link
                to={`/edit/${product.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/80 text-purple-300 hover:bg-purple-600 hover:text-white transition"
                title="Editar"
              >
                <Edit className="h-3.5 w-3.5" />
              </Link>
              <button
                disabled={deleting}
                onClick={async (e) => {
                  e.preventDefault();
                  if (deleting || !window.confirm(`Excluir "${product.title}"?`)) return;
                  setDeleting(true);
                  try { await deleteProduct(product.id); } finally { setDeleting(false); }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/60 text-red-400 hover:bg-red-600 hover:text-white transition"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleQuickAdd}
              disabled={soldOut}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                soldOut
                  ? 'cursor-not-allowed bg-slate-900 text-gray-600'
                  : addedAnim
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-600/30 active:scale-95'
              }`}
            >
              {addedAnim ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Adicionado
                </>
              ) : product.variants?.length ? (
                'Escolher'
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" /> Comprar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
