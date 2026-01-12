import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Product, ProductVariant } from '../types';
import { Plus, Package, DollarSign, Image as ImageIcon, Tag, ArrowLeft, Trash, Upload, RefreshCw, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Admin: React.FC = () => {
  const { addProduct, isAdmin, products, exchangeRate, loading } = useStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    image: '',
    category: 'script',
    stock: '',
  });

  const [inputCurrency, setInputCurrency] = useState<'USD' | 'BRL'>('USD');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVariant, setNewVariant] = useState({ name: '', price: '' });

  // Extract unique categories from existing products for suggestions
  const existingCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    cats.add('plans'); // Ensure plans is available
    return Array.from(cats);
  }, [products]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleInputCurrency = () => {
    // Convert current input values when switching currency
    const newCurrency = inputCurrency === 'USD' ? 'BRL' : 'USD';
    const rate = inputCurrency === 'USD' ? exchangeRate : (1 / exchangeRate);

    // Update Base Price Input
    if (formData.price) {
      const val = parseFloat(formData.price);
      setFormData(prev => ({ ...prev, price: (val * rate).toFixed(2) }));
    }

    // Update New Variant Input
    if (newVariant.price) {
      const val = parseFloat(newVariant.price);
      setNewVariant(prev => ({ ...prev, price: (val * rate).toFixed(2) }));
    }

    setInputCurrency(newCurrency);
  };

  const handleAddVariant = () => {
    if (!newVariant.name || !newVariant.price) return;

    // Always store as USD internally
    const rawPrice = parseFloat(newVariant.price);
    const finalPriceUSD = inputCurrency === 'BRL' ? rawPrice / exchangeRate : rawPrice;

    const variant: ProductVariant = {
      id: Date.now().toString() + Math.random().toString(),
      name: newVariant.name,
      price: finalPriceUSD
    };
    setVariants([...variants, variant]);
    setNewVariant({ name: '', price: '' });
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine final base price in USD
    const rawFormPrice = parseFloat(formData.price);
    const finalBasePriceUSD = inputCurrency === 'BRL' ? rawFormPrice / exchangeRate : rawFormPrice;

    // If variants exist, calculate min price from variants (variants are already stored as USD in state)
    // If no variants, use the form price converted to USD
    const productPrice = variants.length > 0
      ? Math.min(...variants.map(v => v.price))
      : finalBasePriceUSD;

    const newProduct: Product = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      price: productPrice,
      image: formData.image || `https://picsum.photos/seed/${Date.now()}/400/300`,
      category: formData.category.toLowerCase(), // Normalize category to lowercase
      stock: parseInt(formData.stock) || 0,
      variants: variants.length > 0 ? variants : undefined
    };

    const success = await addProduct(newProduct);
    if (success) {
      navigate('/');
    } else {
      alert("Failed to add product. Please check console or try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" />
        Back to Store
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Plus className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Add New Product</h1>
            <p className="text-sm text-gray-400">Create a new listing or plan for Slender Hub</p>
          </div>

          <button
            type="button"
            onClick={toggleInputCurrency}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-blue-400 hover:bg-slate-700 transition border border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Input: {inputCurrency}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Product Title</label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
              <input
                type="text"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Blox Fruits Auto-Farm"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Description</label>
            <textarea
              required
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Describe the features..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* PLANS / VARIANTS SECTION */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-white">Plans / Variants (Optional)</label>
              <span className="text-xs text-gray-500">
                Add pricing options in <span className="text-blue-400 font-bold">{inputCurrency}</span>
              </span>
            </div>

            {variants.length > 0 && (
              <div className="mb-4 space-y-2">
                {variants.map(v => (
                  <div key={v.id} className="flex items-center justify-between rounded bg-slate-900 px-3 py-2 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{v.name}</span>
                      <span className="text-sm text-blue-400">
                        {/* Display variant price converted to current input currency for consistency view */}
                        {inputCurrency === 'BRL'
                          ? `R$ ${(v.price * exchangeRate).toFixed(2)}`
                          : `$${v.price.toFixed(2)}`}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeVariant(v.id)} className="text-red-500 hover:text-white">
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Plan Name (e.g. Lifetime)"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={newVariant.name}
                onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
              />
              <input
                type="number"
                placeholder={`Price (${inputCurrency})`}
                className="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={newVariant.price}
                onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
              />
              <button
                type="button"
                onClick={handleAddVariant}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Base Price - Only required if no variants */}
            {variants.length === 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Price ({inputCurrency})
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                  <input
                    type="number"
                    step="0.01"
                    required={variants.length === 0}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={inputCurrency === 'BRL' ? "179.90" : "29.99"}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                {formData.price && (
                  <p className="mt-1 text-xs text-gray-500">
                    Converts to: <span className="text-blue-400 font-bold">
                      {inputCurrency === 'BRL'
                        ? `$${(parseFloat(formData.price) / exchangeRate).toFixed(2)} USD`
                        : `R$ ${(parseFloat(formData.price) * exchangeRate).toFixed(2)} BRL`}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                <input
                  list="category-list"
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Select or type new..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <datalist id="category-list">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                  <option value="script" />
                  <option value="item" />
                  <option value="plans" />
                  <option value="bundle" />
                  <option value="account" />
                </datalist>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Product Image</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-950 hover:bg-slate-800 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {formData.image ? (
                    <img src={formData.image} className="h-20 object-contain" alt="Preview" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> product image</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>
          </div>

          {/* Stock */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Stock Quantity</label>
            <input
              type="number"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="100"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:shadow-blue-500/40 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Product'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Admin;
