import React from 'react';
import { ShoppingCart, Zap, Package, Trash2, Edit, Eye, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../store';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, isAuthenticated, deleteProduct, formatPrice } = useStore();

  const soldOut = product.stock <= 0;

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('script')) return <Zap className="h-3 w-3 text-yellow-400" />;
    if (c.includes('premium')) return <Sparkles className="h-3 w-3 text-purple-400" />;
    return <Package className="h-3 w-3 text-blue-400" />;
  };

  // Placeholder elegante usado quando a listagem não traz a imagem (payload otimizado)
  const renderThumb = () => {
    const cat = (product.category || '').toLowerCase();
    let gradient = 'from-blue-600 to-indigo-700';
    if (cat.includes('script')) gradient = 'from-yellow-500 to-amber-600';
    if (cat.includes('item')) gradient = 'from-emerald-600 to-teal-700';
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} relative`}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='18' fill='none' stroke='white' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
        <span className="text-4xl font-black text-white/30 drop-shadow-lg">
          {product.title.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10">
      <Link to={`/product/${product.id}`} className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950 block">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100 ${soldOut ? 'grayscale' : ''}`}
            loading="lazy"
          />
        ) : (
          renderThumb()
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-black/50" />
        )}
        {product.featured && (
          <div className="absolute left-3 top-3 rounded-md bg-gradient-to-r from-yellow-500 to-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black shadow-lg">
            Best Seller
          </div>
        )}
        <div className="absolute right-3 top-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm border border-slate-800 flex items-center gap-1.5">
          {getCategoryIcon(product.category)}
          {product.category}
        </div>

        {/* Sold out overlay badge */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/40">
              Esgotado
            </span>
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
           <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 font-semibold text-white backdrop-blur-md">
             <Eye className="h-4 w-4" /> View Details
           </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link to={`/product/${product.id}`}>
            <h3 className="mb-2 text-lg font-bold leading-tight text-white group-hover:text-blue-400 transition-colors">
            {product.title}
            </h3>
        </Link>
        <p className="mb-4 text-sm text-gray-400 line-clamp-2 flex-1">
          {product.description}
        </p>
        
        <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Starting at</span>
            <span className="text-xl font-bold text-white">{formatPrice(product.price)}</span>
          </div>

          {isAuthenticated ? (
            <div className="flex gap-2">
              <Link
                to={`/edit/${product.id}`}
                className="flex items-center justify-center rounded-lg bg-slate-800 p-2 text-blue-400 hover:bg-blue-500 hover:text-white transition"
                title="Edit Product"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={() => deleteProduct(product.id)}
                className="flex items-center justify-center rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500 hover:text-white transition"
                title="Delete Product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              disabled={soldOut}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${soldOut ? 'cursor-not-allowed bg-slate-800 text-gray-500' : 'bg-white text-slate-950 hover:bg-blue-500 hover:text-white hover:scale-105 active:scale-95'}`}
            >
              {soldOut ? <Package className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              {soldOut ? 'Esgotado' : 'Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
