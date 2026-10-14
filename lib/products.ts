import type { CartItem, Product, ProductVariant } from '../types';

export const PRODUCT_SELECT = 'id,title,description,price,image,category,stock,featured,variants:product_variants(id,name,price,image,category,stock)';

export function normalizeProduct(product: Product): Product {
  const variants = (product.variants ?? []).map(v => ({
    ...v, name: v.name.trim(), category: v.category?.trim() || undefined,
    image: v.image?.trim() || undefined, stock: v.stock ?? undefined,
  }));
  const normalized = {
    ...product, title: product.title.trim(), description: product.description.trim(),
    category: product.category.trim().toLowerCase(), image: product.image.trim(),
    featured: product.featured ?? false, variants,
    price: variants.length ? Math.min(...variants.map(v => v.price)) : product.price,
  };
  if (!normalized.id || !normalized.title || !normalized.description || !normalized.category) {
    throw new Error('Preencha título, descrição e categoria.');
  }
  if (!Number.isFinite(normalized.price) || normalized.price < 0) throw new Error('Informe um preço válido, maior ou igual a zero.');
  if (!Number.isSafeInteger(normalized.stock) || normalized.stock < 0) throw new Error('O estoque deve ser um número inteiro maior ou igual a zero.');
  const ids = new Set<string>();
  for (const v of variants) {
    if (!v.id || ids.has(v.id)) throw new Error('Existem variantes duplicadas.');
    ids.add(v.id);
    if (!v.name || !Number.isFinite(v.price) || v.price < 0) throw new Error('Cada variante precisa de nome e preço válido.');
    if (v.stock != null && (!Number.isSafeInteger(v.stock) || v.stock < 0)) throw new Error('O estoque das variantes deve ser inteiro e não negativo.');
  }
  return normalized;
}

export const isVariantSoldOut = (v: { stock?: number | null }) => v.stock != null && v.stock <= 0;
export const isSoldOut = (p: { stock: number; variants?: ProductVariant[] }) =>
  p.stock <= 0 || (!!p.variants?.length && p.variants.every(isVariantSoldOut));

export function addCartItem(cart: CartItem[], product: Product, quantity: number, variant?: ProductVariant): CartItem[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Informe uma quantidade inteira maior que zero.');
  if (isSoldOut(product)) throw new Error('Este produto está esgotado.');
  const selected = variant && product.variants?.find(v => v.id === variant.id);
  if (product.variants?.length && !selected) throw new Error('Escolha uma variante do produto.');
  if (variant && !selected) throw new Error('Esta variante não está mais disponível.');
  if (selected && isVariantSoldOut(selected)) throw new Error('Esta variante está esgotada.');
  const matches = (item: CartItem) => item.id === product.id && item.selectedVariant?.id === selected?.id;
  const existing = cart.find(matches);
  const totalProduct = cart.filter(item => item.id === product.id).reduce((total, item) => total + item.quantity, 0);
  if (totalProduct + quantity > product.stock || (selected?.stock != null && (existing?.quantity ?? 0) + quantity > selected.stock)) {
    throw new Error('A quantidade solicitada excede o estoque disponível.');
  }
  const item = { ...product, price: selected?.price ?? product.price, quantity: (existing?.quantity ?? 0) + quantity, selectedVariant: selected };
  return existing ? cart.map(current => matches(current) ? item : current) : [...cart, item];
}

export function removeCartItem(cart: CartItem[], productId: string, variantId?: string): CartItem[] {
  return cart.filter(item => item.id !== productId || item.selectedVariant?.id !== variantId);
}

export function reconcileCart(cart: CartItem[], products: Product[]): CartItem[] {
  return cart.flatMap(item => {
    const product = products.find(p => p.id === item.id);
    if (!product) return [];
    const selectedVariant = product.variants?.find(v => v.id === item.selectedVariant?.id);
    if ((item.selectedVariant || product.variants?.length) && !selectedVariant) return [];
    return [{ ...product, selectedVariant, quantity: item.quantity, price: selectedVariant?.price ?? product.price }];
  });
}

export function isCartItemUnavailable(item: CartItem, cart: CartItem[]): boolean {
  return isSoldOut(item) || (item.selectedVariant ? isVariantSoldOut(item.selectedVariant) : false)
    || (item.selectedVariant?.stock != null && item.quantity > item.selectedVariant.stock)
    || cart.filter(row => row.id === item.id).reduce((sum, row) => sum + row.quantity, 0) > item.stock;
}
