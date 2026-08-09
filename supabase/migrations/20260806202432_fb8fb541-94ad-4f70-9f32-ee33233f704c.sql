ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS categorias_saida text[] NOT NULL DEFAULT ARRAY['Insumos','Embalagem','Manutenção','Retirada','Outros']::text[],
  ADD COLUMN IF NOT EXISTS cronometro_ativo boolean NOT NULL DEFAULT true;