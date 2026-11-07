import type { Product } from '../types.js';

export class CheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export interface RequestedItem { productId: string; variantId?: string; quantity: number }

export function parseItems(input: unknown): RequestedItem[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) throw new CheckoutError('O carrinho deve conter entre 1 e 50 itens.');
  const items = new Map<string, RequestedItem>();
  for (const row of input) {
    if (!row || typeof row.productId !== 'string' || !row.productId || row.productId.length > 150
      || (row.variantId !== undefined && (typeof row.variantId !== 'string' || !row.variantId || row.variantId.length > 150))
      || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 999) throw new CheckoutError('Item ou quantidade inválida.');
    const key = JSON.stringify([row.productId, row.variantId ?? null]);
    const quantity = (items.get(key)?.quantity ?? 0) + row.quantity;
    if (quantity > 999) throw new CheckoutError('Quantidade excede o limite por item.');
    items.set(key, { productId: row.productId, variantId: row.variantId, quantity });
  }
  return [...items.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

// Prices, amounts and currency supplied by the browser are never trusted.
export function priceItems(items: RequestedItem[], products: Product[]) {
  const totals = new Map<string, number>();
  const lines = items.map(item => {
    const product = products.find(p => p.id === item.productId && !p.is_draft);
    if (!product) throw new CheckoutError('Um produto não está mais disponível.', 409);
    const variant = product.variants?.find(v => v.id === item.variantId);
    if ((item.variantId || product.variants?.length) && !variant) throw new CheckoutError('Selecione uma variante válida.', 409);
    const totalQuantity = (totals.get(product.id) ?? 0) + item.quantity;
    totals.set(product.id, totalQuantity);
    if (!Number.isSafeInteger(product.stock) || totalQuantity > product.stock
      || (variant?.stock != null && (!Number.isSafeInteger(variant.stock) || item.quantity > variant.stock))) throw new CheckoutError('Estoque insuficiente. Revise o carrinho.', 409);
    const price = Number(variant?.price ?? product.price);
    const cents = Math.round((price + Number.EPSILON) * 100);
    if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(cents) || cents < 1) throw new CheckoutError('Este item não tem um preço válido para pagamento.');
    return { productId: product.id, variantId: variant?.id, title: product.title,
      variant: variant?.name, quantity: item.quantity, unitAmount: cents, image: variant?.image || product.image };
  });
  const total = lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0);
  if (!Number.isSafeInteger(total) || total < 50 || total > 99999999) throw new CheckoutError('O total deve estar entre US$ 0,50 e US$ 999.999,99.');
  return { lines, total };
}
