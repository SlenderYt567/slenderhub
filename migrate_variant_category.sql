-- =============================================
-- SLENDER HUB — MIGRATION: Categorias internas em variantes + índices
-- Execute no Supabase SQL Editor (projeto: pypfcdczatmsnqjuggiq)
-- =============================================

BEGIN;

-- 1. Nova coluna category em product_variants
--    Agrupa variantes dentro do produto (ex: Gargantuan, Diamonds Huges, Titanics)
ALTER TABLE public.product_variants 
    ADD COLUMN IF NOT EXISTS category text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS image text,
    ADD COLUMN IF NOT EXISTS stock integer;

-- 2. Índices de performance (pendentes da otimização anterior)
CREATE INDEX IF NOT EXISTS idx_products_created ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON public.chat_sessions (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_timestamp ON public.chat_messages (chat_id, timestamp);

-- 3. (Opcional) Backfill: se você já cadastrou variantes soltas no
--    produto Pet Simulator e quer classificá-las depois, rode:
--    UPDATE public.product_variants SET category = 'Gargantuan' WHERE product_id = 'ID_DO_PRODUTO' AND name ILIKE '%gargantuan%';

-- A remoção de variantes precisa de política própria (inclusive dentro da RPC).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
-- Políticas legadas encontradas no projeto permitiam escrita pública (USING true).
DROP POLICY IF EXISTS "Escrita produtos admin" ON public.products;
DROP POLICY IF EXISTS "Escrita variantes admin" ON public.product_variants;
DROP POLICY IF EXISTS products_update_admin ON public.products;
CREATE POLICY products_update_admin ON public.products FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS product_variants_update_admin ON public.product_variants;
CREATE POLICY product_variants_update_admin ON public.product_variants FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS product_variants_delete_admin ON public.product_variants;
CREATE POLICY product_variants_delete_admin ON public.product_variants
    FOR DELETE TO authenticated USING (public.is_admin());

-- O usuário pode editar o próprio perfil, mas não se tornar administrador.
CREATE OR REPLACE FUNCTION public.protect_profile_admin_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated')
       AND NEW.is_admin IS DISTINCT FROM OLD.is_admin
       AND NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Somente administradores podem alterar permissões.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_admin_flag() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_profile_admin_flag ON public.profiles;
CREATE TRIGGER protect_profile_admin_flag BEFORE UPDATE OF is_admin ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_flag();

REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.products, public.product_variants, public.profiles FROM anon, authenticated;

-- SECURITY INVOKER preserva as políticas RLS existentes. Toda a chamada é atômica.
CREATE OR REPLACE FUNCTION public.save_store_product(p_product jsonb, p_create boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_product public.products%ROWTYPE;
    v_variant jsonb;
    v_variants jsonb := COALESCE(p_product->'variants', '[]'::jsonb);
    v_ids text[] := ARRAY[]::text[];
    v_id text := p_product->>'id';
    v_price numeric;
    v_rows integer;
BEGIN
    IF auth.uid() IS NULL OR NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
    END IF;
    IF p_create IS NULL OR jsonb_typeof(p_product) IS DISTINCT FROM 'object'
       OR COALESCE(btrim(v_id), '') = ''
       OR COALESCE(btrim(p_product->>'title'), '') = ''
       OR COALESCE(btrim(p_product->>'description'), '') = ''
       OR COALESCE(btrim(p_product->>'category'), '') = '' THEN
        RAISE EXCEPTION 'Preencha título, descrição e categoria.' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(p_product->'price') IS DISTINCT FROM 'number'
       OR (p_product->>'price')::numeric < 0
       OR jsonb_typeof(p_product->'stock') IS DISTINCT FROM 'number'
       OR (p_product->>'stock')::numeric < 0
       OR (p_product->>'stock')::numeric <> trunc((p_product->>'stock')::numeric)
       OR jsonb_typeof(v_variants) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Preço, estoque ou variantes inválidos.' USING ERRCODE = '22023';
    END IF;

    FOR v_variant IN SELECT value FROM jsonb_array_elements(v_variants) LOOP
        IF COALESCE(btrim(v_variant->>'id'), '') = ''
           OR v_variant->>'id' = ANY(v_ids)
           OR COALESCE(btrim(v_variant->>'name'), '') = ''
           OR jsonb_typeof(v_variant->'price') IS DISTINCT FROM 'number'
           OR (v_variant->>'price')::numeric < 0 THEN
            RAISE EXCEPTION 'Nome, identificador ou preço de variante inválido.' USING ERRCODE = '22023';
        END IF;
        IF v_variant->>'stock' IS NOT NULL AND (
            jsonb_typeof(v_variant->'stock') IS DISTINCT FROM 'number'
            OR (v_variant->>'stock')::numeric < 0
            OR (v_variant->>'stock')::numeric <> trunc((v_variant->>'stock')::numeric)
        ) THEN
            RAISE EXCEPTION 'Estoque de variante inválido.' USING ERRCODE = '22023';
        END IF;
        v_ids := array_append(v_ids, v_variant->>'id');
    END LOOP;
    SELECT COALESCE(min((value->>'price')::numeric), (p_product->>'price')::numeric)
      INTO v_price FROM jsonb_array_elements(v_variants);

    IF p_create THEN
        INSERT INTO public.products(id, title, description, price, image, category, stock, featured)
        VALUES (v_id, btrim(p_product->>'title'), btrim(p_product->>'description'), v_price,
                COALESCE(p_product->>'image', ''), lower(btrim(p_product->>'category')),
                (p_product->>'stock')::integer, COALESCE((p_product->>'featured')::boolean, false))
        RETURNING * INTO v_product;
    ELSE
        -- UPDATE bloqueia o produto até o final da transação, serializando edições.
        UPDATE public.products SET
            title = btrim(p_product->>'title'), description = btrim(p_product->>'description'),
            price = v_price, image = COALESCE(p_product->>'image', ''),
            category = lower(btrim(p_product->>'category')), stock = (p_product->>'stock')::integer,
            featured = COALESCE((p_product->>'featured')::boolean, false)
        WHERE id = v_id RETURNING * INTO v_product;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto não encontrado ou edição não autorizada.' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    FOR v_variant IN SELECT value FROM jsonb_array_elements(v_variants) LOOP
        INSERT INTO public.product_variants(id, product_id, name, price, image, category, stock)
        VALUES (v_variant->>'id', v_id, btrim(v_variant->>'name'), (v_variant->>'price')::numeric,
                v_variant->>'image', NULLIF(btrim(v_variant->>'category'), ''), (v_variant->>'stock')::integer)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image,
            category = EXCLUDED.category, stock = EXCLUDED.stock
        WHERE public.product_variants.product_id = v_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 1 THEN
            RAISE EXCEPTION 'A variante pertence a outro produto.' USING ERRCODE = '22023';
        END IF;
    END LOOP;
    DELETE FROM public.product_variants WHERE product_id = v_id AND NOT (id = ANY(v_ids));
    IF EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = v_id AND NOT (id = ANY(v_ids))) THEN
        RAISE EXCEPTION 'A remoção das variantes não foi autorizada.' USING ERRCODE = '42501';
    END IF;
    RETURN to_jsonb(v_product) || jsonb_build_object('variants', COALESCE(
        (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.created_at, v.id) FROM public.product_variants v WHERE v.product_id = v_id),
        '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.save_store_product(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_store_product(jsonb, boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
