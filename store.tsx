import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { Product, CartItem, Category, ChatSession, ChatMessage, ProductVariant, User } from './types';
import { supabase } from './lib/supabaseClient';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { PRODUCT_SELECT, addCartItem, removeCartItem, reconcileCart, isSoldOut, isVariantSoldOut } from './lib/products';
import { fetchProduct, saveProduct, removeProduct } from './lib/productRepository';

export type Currency = 'USD' | 'BRL';

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  getProductDetail: (id: string) => Promise<Product | null>;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant | null) => boolean;
  /** Retorna true quando o produto está esgotado (stock <= 0) */
  isSoldOut: (p: { stock: number; variants?: ProductVariant[] }) => boolean;
  /** Retorna true quando a variante está esgotada (stock definido e <= 0) */
  isVariantSoldOut: (v: { stock?: number | null }) => boolean;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  addProduct: (product: Product) => Promise<boolean>;
  updateProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  user: User | null;
  login: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (email: string, pass: string) => Promise<{ error: any; data: any }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authReady: boolean;
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
  // Notifications
  showToast: (text: string, type?: ToastType) => void;
  // Global Loading
  loading: boolean;
  productsError: string;
  reloadProducts: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const commitCart = (next: CartItem[]) => { cartRef.current = next; setCart(next); };
  const mutationRef = useRef(false);
  const catalogRevision = useRef(0);
  const [productsError, setProductsError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Currency State - Cotação de Moeda Dinâmica (USD -> BRL)
  const [currency, setCurrency] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(5.80);

  const showToast = (text: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Buscar cotação real do dólar em tempo real
  useEffect(() => {
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
      .then(res => res.json())
      .then(data => {
        if (data?.USDBRL?.bid) {
          const rate = parseFloat(parseFloat(data.USDBRL.bid).toFixed(2));
          if (Number.isFinite(rate) && rate > 0) setExchangeRate(rate);
        }
      })
      .catch(() => {
        // Fallback em caso de offline
        setExchangeRate(5.80);
      });
  }, []);

  // Fetch Admin state when user changes
  useEffect(() => {
    let cancelled = false;
    setIsAdmin(false);
    if (user) {
      setAuthReady(false);
      void (async () => {
        try {
          const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
          if (!cancelled) setIsAdmin(!error && data?.is_admin === true);
        } catch {
          if (!cancelled) setIsAdmin(false);
        } finally {
          if (!cancelled) setAuthReady(true);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [user?.id]);

  const formatPrice = (priceInUsd: number) => {
    if (currency === 'BRL') {
      return `R$ ${(priceInUsd * exchangeRate).toFixed(2)}`;
    }
    return `$${priceInUsd.toFixed(2)}`;
  };

  // Chat State
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Product cache (sessionStorage) — evita refetch no reload/navegação
  const PRODUCTS_CACHE_KEY = 'slenderhub_products_v3';
  const PRODUCTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // FETCH DATA ON LOAD
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // Deslogado → auth está pronto (não espera query de profiles)
      if (!session?.user) {
        setAuthReady(true);
      }
    }).catch(() => setAuthReady(true));

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setIsAdmin(false); setAuthReady(true); }
      setUser(session?.user ?? null);
    });

    fetchProducts();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user]);

  const refreshProfile = async () => {
    // Legacy profile refresh logic removed
  };

  // Só carrega chats quando um admin está autenticado (páginas de admin/chat).
  // Visitantes públicos NÃO disparam 2 round-trips desnecessários ao Supabase.
  useEffect(() => {
    if (user && isAdmin) {
      fetchChats();
    }
  }, [user, isAdmin]);

  // Busca um produto completo (COM imagem) on-demand para a página de detalhes
  const getProductDetail = useCallback((id: string) => fetchProduct(supabase, id), []);

  const fetchProducts = async (force = false) => {
    const revision = catalogRevision.current;
    // Cache em sessionStorage: produtos aparecem instantaneamente no reload
    if (!force) {
      try {
        const cached = sessionStorage.getItem(PRODUCTS_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Array.isArray(data) && Date.now() - ts < PRODUCTS_CACHE_TTL) {
            setProducts(data as Product[]);
            // Revalidate even when cached: prices and stock may have changed.
          }
        }
      } catch { /* cache inválido — ignora */ }
    }

    setLoading(true);
    setProductsError('');
    try {
      // Listagem busca a coluna image para exibir as fotos dos produtos
      // nos cards (Home). Se o payload ficar pesado, reavaliar com storage.
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && revision === catalogRevision.current) {
        setProducts(data as Product[]);
        commitCart(reconcileCart(cartRef.current, data as Product[]));
        try {
          sessionStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
        } catch { /* storage cheio — ignora */ }
      }
    } catch (e) {
      console.error("Critical fetch error", e);
      setProductsError('Não foi possível atualizar o catálogo. Tente novamente.');
    } finally {
      setLoading(false);
    }
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


  const addToCart = (product: Product, quantity = 1, variant?: ProductVariant | null): boolean => {
    try {
      commitCart(addCartItem(cartRef.current, product, quantity, variant ?? undefined));
      showToast('Produto adicionado ao carrinho.', 'success');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível adicionar ao carrinho.', 'error');
      return false;
    }
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    commitCart(removeCartItem(cartRef.current, productId, variantId));
  };
  const clearCart = () => commitCart([]);

  const persistProduct = async (product: Product, create: boolean): Promise<boolean> => {
    if (!isAdmin || !authReady) { showToast('Acesso restrito a administradores.', 'error'); return false; }
    if (mutationRef.current) return false;
    mutationRef.current = true;
    catalogRevision.current += 1;
    setLoading(true);
    try {
      const saved = await saveProduct(supabase, product, create);
      setProducts(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
      commitCart(reconcileCart(cartRef.current, [...products.filter(p => p.id !== saved.id), saved]));
      try { sessionStorage.removeItem(PRODUCTS_CACHE_KEY); } catch {}
      showToast(create ? 'Produto adicionado com sucesso.' : 'Produto atualizado com sucesso.', 'success');
      return true;
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível salvar o produto.', 'error');
      throw error;
    } finally {
      mutationRef.current = false;
      setLoading(false);
    }
  };
  const addProduct = (product: Product) => persistProduct(product, true);
  const updateProduct = (product: Product) => persistProduct(product, false);

  const deleteProduct = async (productId: string): Promise<boolean> => {
    if (!isAdmin || !authReady) { showToast('Acesso restrito a administradores.', 'error'); return false; }
    if (mutationRef.current) return false;
    mutationRef.current = true;
    catalogRevision.current += 1;
    setLoading(true);
    try {
      await removeProduct(supabase, productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      commitCart(cartRef.current.filter(item => item.id !== productId));
      try { sessionStorage.removeItem(PRODUCTS_CACHE_KEY); } catch {}
      showToast('Produto excluído.', 'success');
      return true;
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível excluir o produto.', 'error');
      return false;
    } finally {
      mutationRef.current = false;
      setLoading(false);
    }
  };
  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      return { error };
    } catch (e: any) {
      console.error(e);
      return { error: e };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
      });
      return { data, error };
    } catch (e: any) {
      console.error(e);
      return { data: null, error: e };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error", e);
    } finally {
      setUser(null);
    }
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
    const { error } = await supabase.from('chat_sessions').insert({
      id: newChat.id,
      customer_name: newChat.customerName,
      status: newChat.status,
      payment_status: newChat.paymentStatus,
      proof_image: newChat.proofImage,
      total_amount: newChat.totalAmount,
      last_message_at: newChat.lastMessageAt
    });

    if (error) {
      console.error("Error creating chat session:", error);
      throw new Error(error.message);
    }

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
        getProductDetail,
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
        authReady,
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
        showToast,
        isSoldOut,
        isVariantSoldOut,
        productsError,
        reloadProducts: () => fetchProducts(true),
        loading
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
