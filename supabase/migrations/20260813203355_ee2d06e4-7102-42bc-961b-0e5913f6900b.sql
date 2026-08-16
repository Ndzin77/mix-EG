ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS marca jsonb NOT NULL DEFAULT '{}'::jsonb;