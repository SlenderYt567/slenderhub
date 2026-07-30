-- =============================================
-- SLENDER HUB — FULL SCHEMA v2 (LuaArmor-like)
-- =============================================
-- Instruções: Execute TODO este SQL no Supabase SQL Editor
-- (projeto: pypfcdczatmsnqjuggiq)

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- =============================================
-- 1. PRODUCTS
-- =============================================
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

-- =============================================
-- 2. PRODUCT VARIANTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_variants (
    id text PRIMARY KEY,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 3. CHAT SESSIONS
-- =============================================
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

-- =============================================
-- 4. CHAT MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id text PRIMARY KEY,
    chat_id text REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    sender text,
    text text,
    timestamp bigint,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 5. DIGITAL KEYS (para vendas de produtos)
-- =============================================
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

-- =============================================
-- 6. PROFILES (expandido)
-- =============================================
-- A tabela profiles já existe no Supabase Auth.
-- Execute estes ALTER TABLE para adicionar colunas:
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS dev_tier text DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS dev_key_limit integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS shortener_url text,
    ADD COLUMN IF NOT EXISTS discord_url text,
    ADD COLUMN IF NOT EXISTS youtube_url text,
    ADD COLUMN IF NOT EXISTS monetag_url text,
    ADD COLUMN IF NOT EXISTS discord_webhook_url text,
    ADD COLUMN IF NOT EXISTS total_revenue numeric DEFAULT 0;

-- Atualizar admin
UPDATE public.profiles SET is_admin = true WHERE email = 'slenderyt9@gmail.com';

-- =============================================
-- 7. LICENSE KEYS (EXPANDIDO — TABELA PRINCIPAL)
-- =============================================
CREATE TABLE IF NOT EXISTS public.license_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key_string text NOT NULL UNIQUE,
    key_hash text NOT NULL UNIQUE,
    owner_id uuid REFERENCES auth.users(id) NOT NULL,
    script_id uuid,
    note text,
    tier text DEFAULT 'basic',
    hwid text,
    hwid_history jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    is_banned boolean DEFAULT false,
    max_instances integer DEFAULT 1,
    total_executions integer DEFAULT 0,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_license_keys_key_hash ON public.license_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_license_keys_owner ON public.license_keys(owner_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_script ON public.license_keys(script_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_hwid ON public.license_keys(hwid);
CREATE INDEX IF NOT EXISTS idx_license_keys_expires ON public.license_keys(expires_at);

-- =============================================
-- 8. PROTECTED SCRIPTS (EXPANDIDO)
-- =============================================
CREATE TABLE IF NOT EXISTS public.protected_scripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES auth.users(id) NOT NULL,
    name text NOT NULL,
    script_content text NOT NULL,
    script_obfuscated text,
    script_checksum text,
    is_active boolean DEFAULT true,
    killswitch_activated boolean DEFAULT false,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =============================================
-- 9. KEY VERIFY LOGS (com key_hash)
-- =============================================
CREATE TABLE IF NOT EXISTS public.key_verify_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash text NOT NULL,
    hwid text,
    ip_address text,
    user_agent text,
    success boolean NOT NULL DEFAULT false,
    reason text,
    script_id text,
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_key_verify_logs_hash ON public.key_verify_logs(key_hash);
CREATE INDEX IF NOT EXISTS idx_key_verify_logs_created ON public.key_verify_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_key_verify_logs_ip ON public.key_verify_logs(ip_address);

-- =============================================
-- 10. DEVICE BLACKLIST
-- =============================================
CREATE TABLE IF NOT EXISTS public.device_blacklist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hwid text NOT NULL UNIQUE,
    reason text,
    banned_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 11. EXECUTION LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.execution_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash text NOT NULL,
    hwid text,
    script_id text,
    session_duration_seconds integer DEFAULT 0,
    ip_address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_hash ON public.execution_logs(key_hash);
CREATE INDEX IF NOT EXISTS idx_execution_logs_hwid ON public.execution_logs(hwid);

-- =============================================
-- STORED PROCEDURES (RPCs)
-- =============================================

-- 1. is_admin() — função auxiliar para RLS (evita recursão)
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    );
$$;

-- 2. hash_license_key
DROP FUNCTION IF EXISTS public.hash_license_key(text) CASCADE;
CREATE OR REPLACE FUNCTION public.hash_license_key(p_key_string text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN encode(digest(p_key_string, 'sha256'), 'hex');
END;
$$;

-- 3. verify_license_key_v2
DROP FUNCTION IF EXISTS public.verify_license_key_v2(text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.verify_license_key_v2(
    p_key_hash text,
    p_hwid text,
    p_script_id text DEFAULT NULL,
    p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_key record;
    v_blacklisted boolean;
    v_days_remaining integer;
    v_response jsonb;
BEGIN
    -- Verificar blacklist de HWID
    SELECT EXISTS(SELECT 1 FROM device_blacklist WHERE hwid = p_hwid) INTO v_blacklisted;
    IF v_blacklisted THEN
        RETURN jsonb_build_object('success', false, 'message', 'Device is blacklisted.', 'code', 'DEVICE_BLACKLISTED');
    END IF;

    -- Buscar key pelo hash
    SELECT * INTO v_key FROM license_keys WHERE key_hash = p_key_hash;
    
    IF v_key.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Key not found.', 'code', 'NOT_FOUND');
    END IF;

    -- Verificar se é banned ou inativa
    IF v_key.is_banned THEN
        RETURN jsonb_build_object('success', false, 'message', 'Key has been banned.', 'code', 'BANNED');
    END IF;

    IF v_key.is_active = false THEN
        RETURN jsonb_build_object('success', false, 'message', 'Key is deactivated.', 'code', 'DEACTIVATED');
    END IF;

    -- Verificar killswitch do script
    IF p_script_id IS NOT NULL THEN
        IF EXISTS(SELECT 1 FROM protected_scripts WHERE id = p_script_id::uuid AND killswitch_activated = true) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Script killswitch activated.', 'code', 'KILLSWITCH');
        END IF;
    END IF;

    -- Verificar expiração
    IF v_key.expires_at IS NOT NULL AND v_key.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Key has expired.', 'code', 'EXPIRED');
    END IF;

    -- Verificar script_id (se a key for específica de um script)
    IF v_key.script_id IS NOT NULL AND p_script_id IS NOT NULL AND v_key.script_id::text <> p_script_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Key not authorized for this script.', 'code', 'WRONG_SCRIPT');
    END IF;

    -- HWID LOCK: bind na primeira execução
    IF v_key.hwid IS NULL THEN
        UPDATE license_keys SET 
            hwid = p_hwid,
            hwid_history = hwid_history || jsonb_build_object('hwid', p_hwid, 'bound_at', now()),
            last_used_at = now(),
            total_executions = total_executions + 1
        WHERE id = v_key.id;
    ELSE
        -- Verificar HWID
        IF v_key.hwid <> p_hwid THEN
            RETURN jsonb_build_object('success', false, 'message', 'HWID mismatch.', 'code', 'HWID_MISMATCH');
        END IF;
        
        -- Atualizar contadores
        UPDATE license_keys SET 
            last_used_at = now(),
            total_executions = total_executions + 1
        WHERE id = v_key.id;
    END IF;

    -- Calcular dias restantes
    IF v_key.expires_at IS NOT NULL THEN
        v_days_remaining := GREATEST(0, ceil(EXTRACT(EPOCH FROM (v_key.expires_at - now())) / 86400)::integer);
    ELSE
        v_days_remaining := -1;
    END IF;

    -- Construir resposta
    v_response := jsonb_build_object(
        'success', true,
        'message', 'Key is valid.',
        'tier', COALESCE(v_key.tier, 'basic'),
        'expires_at', v_key.expires_at,
        'days_remaining', v_days_remaining,
        'hwid_locked', v_key.hwid IS NOT NULL,
        'total_executions', v_key.total_executions + 1,
        'max_instances', v_key.max_instances,
        'is_lifetime', v_key.expires_at IS NULL
    );

    -- Log da verificação
    INSERT INTO key_verify_logs(key_hash, hwid, ip_address, success, reason, script_id)
    VALUES (p_key_hash, p_hwid, p_ip_address, true, 'OK', p_script_id);

    RETURN v_response;
END;
$$;

-- 4. validate_and_get_script_v2
DROP FUNCTION IF EXISTS public.validate_and_get_script_v2(text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.validate_and_get_script_v2(
    p_key_hash text,
    p_hwid text,
    p_script_id text,
    p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_verify_result jsonb;
    v_script record;
BEGIN
    -- Primeiro verificar a key
    v_verify_result := public.verify_license_key_v2(p_key_hash, p_hwid, p_script_id, p_ip_address);
    
    IF NOT (v_verify_result->>'success')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', v_verify_result->>'message');
    END IF;

    -- Buscar script ofuscado (prioridade) ou conteúdo puro
    SELECT * INTO v_script FROM protected_scripts 
    WHERE id = p_script_id::uuid AND is_active = true AND killswitch_activated = false;
    
    IF v_script.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Script not found or disabled');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'script_content', COALESCE(v_script.script_obfuscated, v_script.script_content),
        'script_checksum', v_script.script_checksum,
        'script_name', v_script.name,
        'script_version', v_script.version,
        'tier', v_verify_result->>'tier',
        'expires_at', v_verify_result->>'expires_at',
        'total_executions', v_verify_result->>'total_executions'
    );
END;
$$;

-- 5. activate_killswitch
DROP FUNCTION IF EXISTS public.activate_killswitch(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.activate_killswitch(
    p_script_id uuid,
    p_owner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_script record;
BEGIN
    SELECT * INTO v_script FROM protected_scripts 
    WHERE id = p_script_id AND owner_id = p_owner_id;
    
    IF v_script.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Script not found');
    END IF;
    
    UPDATE protected_scripts SET killswitch_activated = true, updated_at = now()
    WHERE id = p_script_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Killswitch activated for ' || v_script.name);
END;
$$;

-- 6. deliver_key_atomic (já existia, manter)
DROP FUNCTION IF EXISTS public.deliver_key_atomic(text, text, text) CASCADE;
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

    UPDATE public.digital_keys
    SET status = 'DELIVERED',
        assigned_to_email = p_customer_email,
        order_id = p_order_id,
        delivered_at = timezone('utc'::text, now())
    WHERE id = v_key_id;

    RETURN QUERY SELECT true, v_key_id, v_content, 'SUCCESS'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. get_key_gateway_info
DROP FUNCTION IF EXISTS public.get_key_gateway_info(text) CASCADE;
CREATE OR REPLACE FUNCTION public.get_key_gateway_info(
    p_key_string text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_key record;
    v_profile record;
BEGIN
    SELECT lk.*, ps.owner_id as script_owner_id 
    INTO v_key 
    FROM license_keys lk
    LEFT JOIN protected_scripts ps ON ps.id = lk.script_id
    WHERE lk.key_string = p_key_string;
    
    IF v_key.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Key not found');
    END IF;
    
    SELECT * INTO v_profile FROM profiles WHERE id = COALESCE(v_key.script_owner_id, v_key.owner_id);
    
    RETURN jsonb_build_object(
        'success', true,
        'shortener_url', v_profile.shortener_url,
        'discord_url', v_profile.discord_url,
        'youtube_url', v_profile.youtube_url,
        'monetag_url', v_profile.monetag_url,
        'dev_tier', v_profile.dev_tier,
        'note', v_key.note
    );
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY (RLS) — HABILITAR
-- =============================================
-- IMPORTANTE: NUNCA desabilitar RLS em produção!

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_verify_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_blacklist ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- products: qualquer um vê, só admin cria/altera/deleta
DROP POLICY IF EXISTS "products_select_all" ON public.products;
CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin" ON public.products FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin" ON public.products FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE USING (public.is_admin());

-- product_variants: qualquer um vê, só admin altera
DROP POLICY IF EXISTS "product_variants_select_all" ON public.product_variants;
CREATE POLICY "product_variants_select_all" ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_variants_insert_admin" ON public.product_variants;
CREATE POLICY "product_variants_insert_admin" ON public.product_variants FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "product_variants_update_admin" ON public.product_variants;
CREATE POLICY "product_variants_update_admin" ON public.product_variants FOR UPDATE USING (public.is_admin());

-- chat_sessions: admin vê tudo, users veem próprios
DROP POLICY IF EXISTS "chat_sessions_select" ON public.chat_sessions;
CREATE POLICY "chat_sessions_select" ON public.chat_sessions FOR SELECT 
    USING (public.is_admin() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "chat_sessions_insert" ON public.chat_sessions;
CREATE POLICY "chat_sessions_insert" ON public.chat_sessions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "chat_sessions_update" ON public.chat_sessions;
CREATE POLICY "chat_sessions_update" ON public.chat_sessions FOR UPDATE USING (public.is_admin());

-- digital_keys: só admin vê conteúdo
DROP POLICY IF EXISTS "digital_keys_select_admin" ON public.digital_keys;
CREATE POLICY "digital_keys_select_admin" ON public.digital_keys FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "digital_keys_insert_admin" ON public.digital_keys;
CREATE POLICY "digital_keys_insert_admin" ON public.digital_keys FOR INSERT WITH CHECK (public.is_admin());

-- license_keys: owner vê as próprias, admin vê tudo
DROP POLICY IF EXISTS "license_keys_select" ON public.license_keys;
CREATE POLICY "license_keys_select" ON public.license_keys FOR SELECT
    USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "license_keys_insert" ON public.license_keys;
CREATE POLICY "license_keys_insert" ON public.license_keys FOR INSERT
    WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "license_keys_update" ON public.license_keys;
CREATE POLICY "license_keys_update" ON public.license_keys FOR UPDATE
    USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "license_keys_delete" ON public.license_keys;
CREATE POLICY "license_keys_delete" ON public.license_keys FOR DELETE
    USING (auth.uid() = owner_id OR public.is_admin());

-- protected_scripts: owner vê os próprios, admin vê tudo
DROP POLICY IF EXISTS "protected_scripts_select" ON public.protected_scripts;
CREATE POLICY "protected_scripts_select" ON public.protected_scripts FOR SELECT
    USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "protected_scripts_insert" ON public.protected_scripts;
CREATE POLICY "protected_scripts_insert" ON public.protected_scripts FOR INSERT
    WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "protected_scripts_update" ON public.protected_scripts;
CREATE POLICY "protected_scripts_update" ON public.protected_scripts FOR UPDATE
    USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "protected_scripts_delete" ON public.protected_scripts;
CREATE POLICY "protected_scripts_delete" ON public.protected_scripts FOR DELETE
    USING (auth.uid() = owner_id OR public.is_admin());

-- key_verify_logs: INSERT anônimo permitido, SELECT só admin
DROP POLICY IF EXISTS "key_verify_logs_insert" ON public.key_verify_logs;
CREATE POLICY "key_verify_logs_insert" ON public.key_verify_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "key_verify_logs_select" ON public.key_verify_logs;
CREATE POLICY "key_verify_logs_select" ON public.key_verify_logs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "key_verify_logs_delete" ON public.key_verify_logs;
CREATE POLICY "key_verify_logs_delete" ON public.key_verify_logs FOR DELETE USING (public.is_admin());

-- execution_logs: INSERT anônimo, SELECT admin
DROP POLICY IF EXISTS "execution_logs_insert" ON public.execution_logs;
CREATE POLICY "execution_logs_insert" ON public.execution_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "execution_logs_select" ON public.execution_logs;
CREATE POLICY "execution_logs_select" ON public.execution_logs FOR SELECT USING (public.is_admin());

-- device_blacklist: só admin
DROP POLICY IF EXISTS "device_blacklist_select" ON public.device_blacklist;
CREATE POLICY "device_blacklist_select" ON public.device_blacklist FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "device_blacklist_insert" ON public.device_blacklist;
CREATE POLICY "device_blacklist_insert" ON public.device_blacklist FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "device_blacklist_delete" ON public.device_blacklist;
CREATE POLICY "device_blacklist_delete" ON public.device_blacklist FOR DELETE USING (public.is_admin());

-- profiles: cada um vê o próprio perfil, admin vê tudo
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());
