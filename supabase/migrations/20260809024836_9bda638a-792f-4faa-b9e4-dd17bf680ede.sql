ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS price_per_kg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS categorias_produto text[] NOT NULL DEFAULT '{}'::text[];