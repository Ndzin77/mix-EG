ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS salao_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS termo_mesa text NOT NULL DEFAULT 'Mesa',
  ADD COLUMN IF NOT EXISTS qtd_mesas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destinos text[] NOT NULL DEFAULT ARRAY['Balcão']::text[],
  ADD COLUMN IF NOT EXISTS meta_diaria numeric NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS alerta_min integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS atraso_min integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS caixa_privado boolean NOT NULL DEFAULT true;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method_2 public.payment_method,
  ADD COLUMN IF NOT EXISTS amount_2 numeric NOT NULL DEFAULT 0;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;