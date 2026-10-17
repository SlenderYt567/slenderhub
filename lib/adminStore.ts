import { RobloxGame, ProductCategory } from '../types';
import { supabase } from './supabaseClient';

export const INITIAL_GAMES: RobloxGame[] = [
  { id: 'game-1', name: 'Pet Simulator 99', thumb: '/images/fire_dragon.jpg', description: 'Pets Huges, Titanic e Enchantments' },
  { id: 'game-2', name: 'Tap Simulator Reborn', thumb: '/images/shinigami.jpg', description: 'Pets Shinigami e Multiplicadores' },
  { id: 'game-3', name: 'Blox Fruits', thumb: '/images/hero_banner.jpg', description: 'Frutas físicas, Gamepasses e Raças V4' },
  { id: 'game-4', name: 'Blade Ball', thumb: '/images/gargantuan.jpg', description: 'Espadas limitadas e Explosões' },
  { id: 'game-5', name: 'Toilet Tower Defense', thumb: '/images/shinigami.jpg', description: 'Unidades Míticas e Godly' },
  { id: 'game-6', name: 'Outros Jogos', thumb: '/images/hero_banner.jpg', description: 'Jogos diversos do universo Roblox' },
];

export const INITIAL_CATEGORIES: ProductCategory[] = [
  { id: 'cat-1', name: 'Pets' },
  { id: 'cat-2', name: 'Gamepasses' },
  { id: 'cat-3', name: 'Itens / Enchantments' },
  { id: 'cat-4', name: 'Contas Roblox' },
  { id: 'cat-5', name: 'Gargantuan Pets' },
  { id: 'cat-6', name: 'Moedas / Robux' },
];

// ----------------------------------------------------
// EVENT EMITTER FOR REACTIVE UPDATES ACROSS COMPONENTS
// ----------------------------------------------------
type StoreListener = () => void;
const listeners = new Set<StoreListener>();

export const subscribeAdminStore = (listener: StoreListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach(fn => fn());
};

// ----------------------------------------------------
// GAMES CRUD
// ----------------------------------------------------
let gameCache: RobloxGame[] = INITIAL_GAMES;
let categoryCache: ProductCategory[] = INITIAL_CATEGORIES;

export const getStoredGames = (): RobloxGame[] => gameCache;

export const loadGames = async (): Promise<RobloxGame[]> => {
  const { data, error } = await supabase.from('store_games')
    .select('id,name,thumb,description,sort_order').order('sort_order').order('name');
  if (error) throw error;
  gameCache = (data || []).map(({ id, name, thumb, description }) => ({
    id, name, thumb: thumb || undefined, description: description || undefined,
  }));
  notifyListeners();
  return gameCache;
};

export const saveGame = async (game: Omit<RobloxGame, 'id'> & { id?: string }): Promise<RobloxGame> => {
  const newGame: RobloxGame = {
    id: game.id || `game-${crypto.randomUUID()}`,
    name: game.name.trim(),
    thumb: game.thumb || '/images/hero_banner.jpg',
    description: game.description?.trim(),
  };
  const { error } = await supabase.from('store_games').upsert(newGame, { onConflict: 'id' });
  if (error) throw error;
  await loadGames();
  return newGame;
};

export const deleteStoredGame = async (gameId: string): Promise<void> => {
  const { error } = await supabase.from('store_games').delete().eq('id', gameId);
  if (error) throw error;
  await loadGames();
  await loadCategories();
};

// ----------------------------------------------------
// CATEGORIES CRUD
// ----------------------------------------------------
export const getStoredCategories = (): ProductCategory[] => categoryCache;

export const loadCategories = async (): Promise<ProductCategory[]> => {
  const { data, error } = await supabase.from('store_categories').select('id,name,game_id').order('name');
  if (error) throw error;
  categoryCache = (data || []).map(({ id, name, game_id }) => ({ id, name, gameId: game_id || undefined }));
  notifyListeners();
  return categoryCache;
};

export const saveCategory = async (cat: Omit<ProductCategory, 'id'> & { id?: string }): Promise<ProductCategory> => {
  const newCat: ProductCategory = { id: cat.id || `cat-${crypto.randomUUID()}`, name: cat.name.trim(), gameId: cat.gameId };
  const { error } = await supabase.from('store_categories').upsert({
    id: newCat.id, name: newCat.name, game_id: newCat.gameId || null,
  }, { onConflict: 'id' });
  if (error) throw error;
  await loadCategories();
  return newCat;
};

export const deleteStoredCategory = async (catId: string): Promise<void> => {
  const { error } = await supabase.from('store_categories').delete().eq('id', catId);
  if (error) throw error;
  await loadCategories();
};
