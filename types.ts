export type Category = string;

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  image?: string;
  /** Subcategoria da variante (ex: Gargantuan, Diamonds Huges, Titanics) */
  category?: string;
  /** Stock da variante. 0 = esgotada. undefined = disponível (variantes antigas sem stock). */
  stock?: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number; // Base price (or lowest price)
  image: string;
  category: Category;
  stock: number;
  featured?: boolean;
  game_name?: string | null;
  short_description?: string | null;
  original_price?: number | null;
  delivery_mode?: 'manual' | 'digital';
  is_draft?: boolean;
  variants?: ProductVariant[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  customerName: string;
  status: 'pending_payment' | 'open' | 'closed';
  paymentStatus: 'pending' | 'verified';
  proofImage?: string; // Base64 string of the uploaded file
  lastMessageAt: number;
  orderId?: string;
  totalAmount?: number;
}

export interface User {
  id: string;
  email?: string;
}

export type KeyStatus = 'AVAILABLE' | 'RESERVED' | 'DELIVERED';

export interface DigitalKey {
  id: string;
  productId: string;
  content: string;
  status: KeyStatus;
  assignedToEmail?: string;
  orderId?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface RobloxGame {
  id: string;
  name: string;
  thumb?: string;
  description?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  gameId?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  robloxUsername: string;
  productId?: string;
  productName: string;
  productCategory: string;
  productThumb: string;
  variantName?: string;
  priceUsd: number;
  paymentMethod: string;
  paymentStatus: 'Confirmado' | 'Pendente' | 'Cancelado';
  paymentId: string;
  paymentDate: string;
  status: 'Pendente' | 'Em aprovação' | 'Em entrega' | 'Entregue' | 'Cancelado';
  createdAt: string;
  createdAtIso?: string;
  customerNotes?: string;
}
