ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS origem public.payment_method;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bloqueios jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preparo_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preparo_token text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS prep_status text NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS prep_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS prep_done_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS order_items_prep_idx ON public.order_items (tenant_id, prep_status, created_at);

ALTER TABLE public.order_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;