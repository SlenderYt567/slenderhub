-- =============================================
-- SLENDER HUB — MIGRATION: Categorias internas em variantes + índices
-- Execute no Supabase SQL Editor (projeto: pypfcdczatmsnqjuggiq)
-- =============================================

-- 1. Nova coluna category em product_variants
--    Agrupa variantes dentro do produto (ex: Gargantuan, Diamonds Huges, Titanics)
ALTER TABLE public.product_variants 
    ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;

-- 2. Índices de performance (pendentes da otimização anterior)
CREATE INDEX IF NOT EXISTS idx_products_created ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON public.chat_sessions (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_timestamp ON public.chat_messages (chat_id, timestamp);

-- 3. (Opcional) Backfill: se você já cadastrou variantes soltas no
--    produto Pet Simulator e quer classificá-las depois, rode:
--    UPDATE public.product_variants SET category = 'Gargantuan' WHERE product_id = 'ID_DO_PRODUTO' AND name ILIKE '%gargantuan%';
