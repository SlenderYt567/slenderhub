-- Criação das tabelas do Slender Hub

-- 1. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text,
    price numeric NOT NULL,
    image text,
    category text,
    stock integer DEFAULT 0,
    featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Variantes do Produto (keys, etc)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id text PRIMARY KEY,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Sessões de Chat / Pedidos
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id text PRIMARY KEY,
    customer_name text,
    status text,
    payment_status text,
    proof_image text,
    total_amount numeric,
    last_message_at bigint,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Mensagens no Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id text PRIMARY KEY,
    chat_id text REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    sender text,
    text text,
    timestamp bigint,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Desativar RLS para permitir que o front-end funcione diretamente 
-- (Você pode configurar políticas de segurança depois)
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
