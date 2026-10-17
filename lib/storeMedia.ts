import { supabase } from './supabaseClient';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadStoreImage(file: File, folder: 'games' | 'products'): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('store-media').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('store-media').getPublicUrl(path).data.publicUrl;
}
