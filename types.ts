export type Category = string;

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
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
