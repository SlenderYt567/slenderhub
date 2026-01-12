import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, CartItem, Category, ChatSession, ChatMessage, ProductVariant, User } from './types';
import { supabase } from './lib/supabaseClient';

export type Currency = 'USD' | 'BRL';

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variant?: any) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  addProduct: (product: Product) => Promise<boolean>;
  updateProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<void>;
  user: User | null;
  login: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (email: string, pass: string) => Promise<{ error: any; data: any }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  totalCartValue: number;
  // Chat capabilities
  chats: ChatSession[];
  messages: ChatMessage[];
  createChat: (customerName: string, proofImage: string, total: number) => Promise<string>;
  sendMessage: (chatId: string, text: string, sender: 'user' | 'admin') => Promise<void>;
  closeChat: (chatId: string) => Promise<void>;
  verifyPayment: (chatId: string) => Promise<void>;
  // Currency
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  formatPrice: (priceInUsd: number) => string;
  // Global Loading
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Currency State
  const [currency, setCurrency] = useState<Currency>('USD');
  const exchangeRate = 6.0; // Fixed rate: 1 USD = 6 BRL

  // Admin Check
  const isAdmin = user?.email === 'slenderyt9@gmail.com';

  const formatPrice = (priceInUsd: number) => {
    if (currency === 'BRL') {
      return `R$ ${(priceInUsd * exchangeRate).toFixed(2)}`;
    }
    return `$${priceInUsd.toFixed(2)}`;
  };

  // Chat State
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // FETCH DATA ON LOAD
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchProducts();
    fetchChats();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, variants:product_variants(*)')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching products:', error);
    if (data) setProducts(data as Product[]);
    setLoading(false);
  };

  const fetchChats = async () => {
    // Fetch sessions
    const { data: sessionData } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (sessionData) {
      const mappedSessions = sessionData.map((s: any) => ({
        id: s.id,
        customerName: s.customer_name,
        status: s.status,
        paymentStatus: s.payment_status,
        proofImage: s.proof_image,
        totalAmount: s.total_amount,
        lastMessageAt: s.last_message_at
      }));
      setChats(mappedSessions);
    }

    // Fetch messages
    const { data: msgData } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (msgData) {
      const mappedMessages = msgData.map((m: any) => ({
        id: m.id,
        chatId: m.chat_id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp
      }));
      setMessages(mappedMessages);
    }
  };


  const addToCart = (product: Product, quantity = 1, variant?: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => {
        if (variant) {
          return item.id === product.id && item.selectedVariant?.id === variant.id;
        }
        return item.id === product.id;
      });

      if (existing) {
        return prev.map((item) => {
          const isMatch = variant
            ? item.id === product.id && item.selectedVariant?.id === variant.id
            : item.id === product.id;

          return isMatch ? { ...item, quantity: item.quantity + quantity } : item;
        });
      }

      const finalPrice = variant ? variant.price : product.price;
      return [...prev, { ...product, price: finalPrice, quantity, selectedVariant: variant }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => {
      return item.id !== productId;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  // --- SUPABASE ACTIONS ---

  const addProduct = async (product: Product): Promise<boolean> => {
    setLoading(true);
    // 1. Insert Product
    const { error } = await supabase.from('products').insert({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category,
      stock: product.stock,
      featured: product.featured || false
    });

    if (error) {
      console.error("Error inserting product:", error);
      setLoading(false);
      return false;
    }

    // 2. Insert Variants if any
    if (product.variants && product.variants.length > 0) {
      const variantsToInsert = product.variants.map(v => ({
        id: v.id,
        product_id: product.id,
        name: v.name,
        price: v.price
      }));
      await supabase.from('product_variants').insert(variantsToInsert);
    }

    // Update local state
    setProducts((prev) => [product, ...prev]);
    setLoading(false);
    return true;
  };

  const updateProduct = async (updatedProduct: Product): Promise<boolean> => {
    setLoading(true);
    // Update main product
    const { error } = await supabase.from('products').update({
      title: updatedProduct.title,
      description: updatedProduct.description,
      price: updatedProduct.price,
      image: updatedProduct.image,
      category: updatedProduct.category,
      stock: updatedProduct.stock
    }).eq('id', updatedProduct.id);

    if (error) {
      setLoading(false);
      return false;
    }

    // Handle variants: Delete all old ones and re-insert
    await supabase.from('product_variants').delete().eq('product_id', updatedProduct.id);

    if (updatedProduct.variants && updatedProduct.variants.length > 0) {
      const variantsToInsert = updatedProduct.variants.map(v => ({
        id: v.id,
        product_id: updatedProduct.id,
        name: v.name,
        price: v.price
      }));
      await supabase.from('product_variants').insert(variantsToInsert);
    }

    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    setLoading(false);
    return true;
  };

  const deleteProduct = async (productId: string) => {
    setLoading(true);
    await supabase.from('products').delete().eq('id', productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setLoading(false);
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    setLoading(false);
    return { data, error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Chat Functions
  const createChat = async (customerName: string, proofImage: string, total: number): Promise<string> => {
    const newChatId = Date.now().toString();
    const now = Date.now();

    const newChat: ChatSession = {
      id: newChatId,
      customerName,
      status: 'pending_payment',
      paymentStatus: 'pending',
      proofImage,
      totalAmount: total,
      lastMessageAt: now,
    };

    // Insert session to DB
    await supabase.from('chat_sessions').insert({
      id: newChat.id,
      customer_name: newChat.customerName,
      status: newChat.status,
      payment_status: newChat.paymentStatus,
      proof_image: newChat.proofImage,
      total_amount: newChat.totalAmount,
      last_message_at: newChat.lastMessageAt
    });

    setChats(prev => [newChat, ...prev]);

    // Initial system message
    const welcomeMsg: ChatMessage = {
      id: Date.now().toString(),
      chatId: newChatId,
      sender: 'admin',
      text: `Thank you for your payment proof! An admin will verify it shortly and release your products.`,
      timestamp: now,
    };

    await supabase.from('chat_messages').insert({
      id: welcomeMsg.id,
      chat_id: welcomeMsg.chatId,
      sender: welcomeMsg.sender,
      text: welcomeMsg.text,
      timestamp: welcomeMsg.timestamp
    });

    setMessages(prev => [...prev, welcomeMsg]);

    return newChatId;
  };

  const sendMessage = async (chatId: string, text: string, sender: 'user' | 'admin') => {
    const now = Date.now();
    const msg: ChatMessage = {
      id: now.toString() + Math.random().toString().slice(2, 5),
      chatId,
      sender,
      text,
      timestamp: now,
    };

    await supabase.from('chat_messages').insert({
      id: msg.id,
      chat_id: msg.chatId,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp
    });

    // Update session timestamp
    await supabase.from('chat_sessions').update({ last_message_at: now }).eq('id', chatId);

    setMessages(prev => [...prev, msg]);
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, lastMessageAt: now } : c
    ));
  };

  const verifyPayment = async (chatId: string) => {
    await supabase.from('chat_sessions').update({
      status: 'open',
      payment_status: 'verified'
    }).eq('id', chatId);

    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, status: 'open', paymentStatus: 'verified' } : c
    ));

    const now = Date.now();
    const msg: ChatMessage = {
      id: now.toString(),
      chatId,
      sender: 'admin',
      text: `Payment Confirmed! We are now preparing your delivery.`,
      timestamp: now,
    };

    await supabase.from('chat_messages').insert({
      id: msg.id,
      chat_id: msg.chatId,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp
    });

    setMessages(prev => [...prev, msg]);
  };

  const closeChat = async (chatId: string) => {
    await supabase.from('chat_sessions').update({ status: 'closed' }).eq('id', chatId);

    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, status: 'closed' } : c
    ));
  };

  const totalCartValue = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        products,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        addProduct,
        updateProduct,
        deleteProduct,
        user,
        login,
        signUp,
        logout,
        isAuthenticated: !!user,
        isAdmin,
        totalCartValue,
        chats,
        messages,
        createChat,
        sendMessage,
        closeChat,
        verifyPayment,
        currency,
        setCurrency,
        exchangeRate,
        formatPrice,
        loading
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
