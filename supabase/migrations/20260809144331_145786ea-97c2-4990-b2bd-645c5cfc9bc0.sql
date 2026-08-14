ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS prep_ordem numeric;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS preparo_senha jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS opcoes text[] NOT NULL DEFAULT '{}'::text[];