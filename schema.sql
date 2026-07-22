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

-- 5. Tabela de Chaves Digitais / Links de Acesso
CREATE TABLE IF NOT EXISTS public.digital_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'DELIVERED')),
    assigned_to_email text,
    order_id text,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Desativar RLS para permitir que o front-end/API funcionem diretamente 
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_keys DISABLE ROW LEVEL SECURITY;

-- 6. Tabela de Log de Verificações de Keys (Analytics + Auditoria)
CREATE TABLE IF NOT EXISTS public.key_verify_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key_string text NOT NULL,
    hwid text,
    ip_address text,
    success boolean NOT NULL DEFAULT false,
    reason text,
    script_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index para queries de analytics (por key e por data)
CREATE INDEX IF NOT EXISTS idx_key_verify_logs_key ON public.key_verify_logs(key_string);
CREATE INDEX IF NOT EXISTS idx_key_verify_logs_created ON public.key_verify_logs(created_at DESC);

-- Desabilitar RLS (acesso via service role na API)
ALTER TABLE public.key_verify_logs DISABLE ROW LEVEL SECURITY;

-- 7. Stored Procedure Atômica para Resgate Seguro de Keys (Sem Duplicatas)
CREATE OR REPLACE FUNCTION public.deliver_key_atomic(
    p_product_id text,
    p_order_id text,
    p_customer_email text
)
RETURNS TABLE (
    success boolean,
    key_id uuid,
    content text,
    message text
) AS $$
DECLARE
    v_key_id uuid;
    v_content text;
BEGIN
    -- Seleciona e trava 1 key disponível para evitar race condition (duplicação)
    SELECT id, digital_keys.content INTO v_key_id, v_content
    FROM public.digital_keys
    WHERE digital_keys.product_id = p_product_id
      AND digital_keys.status = 'AVAILABLE'
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_key_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'OUT_OF_STOCK'::text;
        RETURN;
    END IF;

    -- Marca a key como DELIVERED
    UPDATE public.digital_keys
    SET status = 'DELIVERED',
        assigned_to_email = p_customer_email,
        order_id = p_order_id,
        delivered_at = timezone('utc'::text, now())
    WHERE id = v_key_id;

    RETURN QUERY SELECT true, v_key_id, v_content, 'SUCCESS'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

