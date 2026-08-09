ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS recibo_config jsonb NOT NULL DEFAULT '{}'::jsonb;