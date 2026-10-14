import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Product, ProductVariant } from '../types';
import { Save, Package, DollarSign, Image as ImageIcon, Tag, ArrowLeft, Trash, Upload, RefreshCw, Edit2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { compressImage } from '../lib/compressImage';
import { normalizeProduct } from '../lib/products';

const ProductForm: React.FC<{ mode: 'create' | 'edit' }> = ({ mode }) => {
  const { products, addProduct, updateProduct, getProductDetail, isAdmin, authReady, exchangeRate } = useStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    image: '',
    category: 'gamepass',
    stock: '',
    featured: false,
  });
  const [loadingProduct, setLoadingProduct] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const savingRef = useRef(false);
  const productId = useRef(crypto.randomUUID());

  const [inputCurrency, setInputCurrency] = useState<'USD' | 'BRL'>('USD');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVariant, setNewVariant] = useState({ name: '', price: '', image: '', category: '', stock: '' });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Sugestões de categorias internas do produto (ex: Pet Simulator)
  const VARIANT_CATEGORY_SUGGESTIONS = ['Gargantuan', 'Diamonds Huges', 'Titanics', 'Huge', 'Normal', 'Exclusive'];

  // Agrupa variantes por categoria para exibição organizada
  const groupedVariants = useMemo(() => {
    return variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
      const key = v.category?.trim() || 'Uncategorized';
      (acc[key] = acc[key] || []).push(v);
      return acc;
    }, {});
  }, [variants]);

  // Extract unique categories for suggestions
  const existingCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category)));
  }, [products]);

  useEffect(() => {
    if (!authReady) return;
    if (!isAdmin) {
      navigate('/login', { replace: true });
      return;
    }
    if (mode === 'create') return;
    let cancelled = false;
    setLoadingProduct(true);
    setLoadError('');
    const load = async () => {
      try {
        const product = id ? await getProductDetail(id) : null;
        if (cancelled) return;
        if (!product) throw new Error('Produto não encontrado.');
        setFormData({
          title: product.title,
          description: product.description ?? '',
          price: product.price.toString(),
          image: product.image || '',
          category: product.category || 'gamepass',
          stock: (product.stock ?? 0).toString(),
          featured: product.featured ?? false,
        });
        setVariants(product.variants ?? []);
        setInputCurrency('USD');
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar o produto.');
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id, mode, authReady, isAdmin, navigate, getProductDetail]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError('Selecione uma imagem de até 10 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        reader.readAsDataURL(file);
      });
      const image = await compressImage(data);
      setFormData(prev => ({ ...prev, image }));
    } catch {
      setError('Não foi possível carregar a imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const toggleInputCurrency = () => {
    const newCurrency = inputCurrency === 'USD' ? 'BRL' : 'USD';
    const rate = inputCurrency === 'USD' ? exchangeRate : (1 / exchangeRate);

    if (formData.price) {
      const val = parseFloat(formData.price);
      setFormData(prev => ({ ...prev, price: (val * rate).toFixed(2) }));
    }

    if (newVariant.price) {
      const val = parseFloat(newVariant.price);
      setNewVariant(prev => ({ ...prev, price: (val * rate).toFixed(2) }));
    }

    setInputCurrency(newCurrency);
  };



  const handleAddVariant = () => {
    if (!newVariant.name.trim() || newVariant.price.trim() === '' || !Number.isFinite(Number(newVariant.price)) || Number(newVariant.price) < 0) {
      setError('Preencha o nome e um preço válido para a variante.');
      return;
    }
    if (newVariant.stock !== '' && (!Number.isSafeInteger(Number(newVariant.stock)) || Number(newVariant.stock) < 0)) {
      setError('O estoque da variante deve ser inteiro e não negativo.');
      return;
    }
    setError('');

    // Always store as USD internally
    const rawPrice = parseFloat(newVariant.price);
    const finalPriceUSD = inputCurrency === 'BRL' ? rawPrice / exchangeRate : rawPrice;

    // Stock da variante: vazio = disponível (undefined), 0 = esgotada
    const stockVal = newVariant.stock === '' ? undefined : Number(newVariant.stock);

    if (editingVariantId) {
      setVariants(variants.map(v => v.id === editingVariantId ? {
        ...v,
        name: newVariant.name,
        price: finalPriceUSD,
        image: newVariant.image || undefined,
        category: newVariant.category || undefined,
        stock: stockVal
      } : v));
      setEditingVariantId(null);
    } else {
      const variant: ProductVariant = {
        id: crypto.randomUUID(),
        name: newVariant.name,
        price: finalPriceUSD,
        image: newVariant.image || undefined,
        category: newVariant.category || undefined,
        stock: stockVal
      };
      setVariants([...variants, variant]);
    }
    setNewVariant({ name: '', price: '', image: '', category: '', stock: '' });
  };

  const editVariant = (variant: ProductVariant) => {
    const variantPriceInInputCurrency = inputCurrency === 'BRL'
      ? (variant.price * exchangeRate).toFixed(2)
      : variant.price.toFixed(2);

    setNewVariant({
      name: variant.name,
      price: variantPriceInInputCurrency,
      image: variant.image || '',
      category: variant.category || '',
      stock: variant.stock == null ? '' : variant.stock.toString()
    });
    setEditingVariantId(variant.id);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
    if (editingVariantId === id) {
      setEditingVariantId(null);
      setNewVariant({ name: '', price: '', image: '', category: '', stock: '' });
    }
  };

  // Edita stock de uma variante diretamente na lista (0 = esgotado, vazio = ilimitado)
  const updateVariantStock = (id: string, val: string) => {
    setVariants(variants.map(v =>
      v.id === id
        ? { ...v, stock: val === '' ? undefined : Number(val) }
        : v
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || uploading || loadingProduct) return;
    if (Object.values(newVariant).some(value => value.trim() !== '')) {
      setError('Adicione ou atualize a variante em edição antes de salvar o produto, ou clique em Cancelar.');
      return;
    }
    setError('');

    // Determine final base price in USD
    const rawFormPrice = parseFloat(formData.price);
    const finalBasePriceUSD = inputCurrency === 'BRL' ? rawFormPrice / exchangeRate : rawFormPrice;

    // If variants exist, calculate min price from variants
    const productPrice = variants.length > 0
      ? Math.min(...variants.map(v => v.price))
      : finalBasePriceUSD;

    const updatedProduct: Product = {
      id: mode === 'edit' ? id! : productId.current,
      title: formData.title,
      description: formData.description,
      price: productPrice,
      image: formData.image || '',
      category: formData.category.toLowerCase(),
      stock: formData.stock.trim() === '' ? NaN : Number(formData.stock),
      featured: formData.featured,
      variants: variants.length > 0 ? variants : undefined
    };
    try {
      const product = normalizeProduct(updatedProduct);
      savingRef.current = true;
      setSaving(true);
      const success = await (mode === 'edit' ? updateProduct(product) : addProduct(product));
      if (success) navigate('/');
      else setError('Não foi possível salvar. Seus dados foram mantidos; confira a mensagem de erro e tente novamente.');
    } catch (err) {
      setError((err as { message?: string })?.message || 'Não foi possível salvar o produto.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!authReady || loadingProduct) return <p role="status" className="p-12 text-center text-gray-400">Carregando produto…</p>;
  if (!isAdmin) return null;
  if (loadError) return <div className="p-12 text-center"><p role="alert">{loadError}</p><Link to="/" className="text-blue-400">Voltar à loja</Link><button type="button" onClick={() => window.location.reload()} className="ml-4 text-blue-400">Tentar novamente</button></div>;

  // stock === 0  =>  produto marcado como esgotado
  const soldOutChecked = parseInt(formData.stock) === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" />
        Back to Store
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
            <Save className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{mode === 'edit' ? 'Editar produto' : 'Adicionar produto'}</h1>
            <p className="text-sm text-gray-400">Dados, preços e variantes da loja</p>
          </div>
          <button
            type="button"
            onClick={toggleInputCurrency}
            disabled={saving || uploading}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-blue-400 hover:bg-slate-700 transition border border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Input: {inputCurrency}
          </button>

        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <fieldset disabled={saving || uploading} className="min-w-0 space-y-6 disabled:opacity-60">
          {/* Title */}
          <div>
            <label htmlFor="product-title" className="mb-2 block text-sm font-medium text-gray-300">Product Title</label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
              <input
                type="text"
                id="product-title"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="product-description" className="mb-2 block text-sm font-medium text-gray-300">Description</label>
            <textarea
              id="product-description"
              required
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* PLANS / VARIANTS SECTION */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-white">Plans / Variants</label>
              <span className="text-xs text-gray-500">
                Edit pricing options in <span className="text-blue-400 font-bold">{inputCurrency}</span>
              </span>
            </div>

            {variants.length > 0 && (
              <div className="mb-4 space-y-3">
                {Object.entries(groupedVariants).map(([cat, list]) => (
                  <div key={cat}>
                    <div className="mb-1.5 inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      {cat}
                    </div>
                    <div className="space-y-2">
                      {list.map(v => (
                        <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-slate-900 px-3 py-2 border border-slate-800">
                          <div className="flex flex-wrap items-center gap-3">
                            {v.image && (
                               <img src={v.image} alt={v.name} className="w-8 h-8 rounded bg-slate-950 object-cover" />
                            )}
                            <span className="font-medium text-white">{v.name}</span>
                            <span className="text-sm text-blue-400">
                              {inputCurrency === 'BRL'
                                ? `R$ ${(v.price * exchangeRate).toFixed(2)}`
                                : `$${v.price.toFixed(2)}`}
                            </span>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Stock
                              <input
                                type="number"
                                min={0}
                                placeholder="∞"
                                title="Stock da variante: 0 = esgotado, vazio = ilimitado"
                                className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                                value={v.stock ?? ''}
                                onChange={(e) => updateVariantStock(v.id, e.target.value)}
                              />
                            </label>
                            {v.stock != null && v.stock <= 0 && (
                              <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500 ring-1 ring-red-500/40">Esgotado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" aria-label={`Editar variante ${v.name}`} onClick={() => editVariant(v)} className="text-blue-500 hover:text-white">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button type="button" aria-label={`Remover variante ${v.name}`} onClick={() => removeVariant(v.id)} className="text-red-500 hover:text-white">
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Variant Name"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={newVariant.name}
                onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
              />
              <input
                type="text"
                list="variant-categories-edit"
                placeholder="Category (Gargantuan, Huges, Titanics…)"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={newVariant.category}
                onChange={(e) => setNewVariant({ ...newVariant, category: e.target.value })}
              />
              <datalist id="variant-categories-edit">
                {VARIANT_CATEGORY_SUGGESTIONS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <input
                type="text"
                placeholder="Image URL (Optional)"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={newVariant.image}
                onChange={(e) => setNewVariant({ ...newVariant, image: e.target.value })}
              />
              <input
                type="number"
                placeholder={`Price (${inputCurrency})`}
                min={0}
                step="any"
                className="w-full sm:w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={newVariant.price}
                onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
              />
              <input
                type="number"
                min={0}
                placeholder="Stock (0=esgotado)"
                className="w-36 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                value={newVariant.stock}
                onChange={(e) => setNewVariant({ ...newVariant, stock: e.target.value })}
              />
              <button
                type="button"
                onClick={handleAddVariant}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${editingVariantId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'}`}
              >
                {editingVariantId ? 'Update' : 'Add'}
              </button>
              {(editingVariantId || Object.values(newVariant).some(Boolean)) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVariantId(null);
                    setNewVariant({ name: '', price: '', image: '', category: '', stock: '' });
                  }}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-600"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Price - Only required if no variants */}
            {variants.length === 0 && (
              <div>
                <label htmlFor="product-price" className="mb-2 block text-sm font-medium text-gray-300">Price ({inputCurrency})</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                  <input
                    type="number"
                    step="0.01"
                    id="product-price"
                    min={0}
                    required={variants.length === 0}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label htmlFor="product-category" className="mb-2 block text-sm font-medium text-gray-300">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                <select
                  id="product-category"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="gamepass">Gamepasses</option>
                  <option value="robux">Robux</option>
                  <option value="item">Exclusive Items</option>
                  {existingCategories.filter(c => !['gamepass', 'robux', 'item'].includes(c)).map(cat => (
                      <option key={cat} value={cat}>{cat} (Legacy)</option>
                  ))}
                </select>
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
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={formData.featured} onChange={e => setFormData(prev => ({ ...prev, featured: e.target.checked }))} />Produto em destaque</label>
            <label htmlFor="product-stock" className="mb-2 block text-sm font-medium text-gray-300">Stock Quantity</label>
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
              <input
                type="checkbox"
                id="sold-out-edit"
                checked={soldOutChecked}
                onChange={(e) => setFormData({ ...formData, stock: e.target.checked ? '0' : '1' })}
                className="h-4 w-4 accent-red-500"
              />
              <label htmlFor="sold-out-edit" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                Marcar como esgotado
              </label>
            </div>
            <input
              type="number"
              required
              disabled={soldOutChecked}
              id="product-stock"
              min={0}
              step={1}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500 hover:shadow-orange-500/40"
          >
            {saving ? 'Salvando…' : uploading ? 'Processando imagem…' : mode === 'edit' ? 'Salvar alterações' : 'Adicionar produto'}
          </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
