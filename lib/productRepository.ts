import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '../types';
import { normalizeProduct, PRODUCT_SELECT } from './products';

export async function fetchProduct(client: SupabaseClient, id: string): Promise<Product | null> {
  const { data, error } = await client.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function saveProduct(client: SupabaseClient, product: Product, create: boolean): Promise<Product> {
  const normalized = normalizeProduct(product);
  // One database transaction: a variant failure rolls back the entire product save.
  const { data, error } = await client.rpc('save_store_product', { p_product: normalized, p_create: create });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('O banco precisa da atualização de produtos. Aplique migrate_variant_category.sql no Supabase antes de salvar.');
    throw error;
  }
  if (!data?.id) throw new Error('O banco não confirmou o salvamento. Atualize a página antes de tentar novamente.');
  return data as Product;
}

export async function removeProduct(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from('products').delete().eq('id', id).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Produto não encontrado ou exclusão não autorizada.');
}
