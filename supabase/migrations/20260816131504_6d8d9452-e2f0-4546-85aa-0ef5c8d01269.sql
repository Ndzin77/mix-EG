-- Ordem da fila de preparo: uma régua só (posição), evitando mistura com horário.
UPDATE public.order_items oi
SET prep_ordem = sub.pos
FROM (
  SELECT id, (EXTRACT(EPOCH FROM created_at) - 1750000000) AS pos
  FROM public.order_items
  WHERE prep_ordem IS NULL
) sub
WHERE oi.id = sub.id AND oi.prep_ordem IS NULL;

CREATE OR REPLACE FUNCTION public.set_prep_ordem()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.prep_ordem IS NULL THEN
    NEW.prep_ordem := EXTRACT(EPOCH FROM COALESCE(NEW.created_at, now())) - 1750000000;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_prep_ordem ON public.order_items;
CREATE TRIGGER order_items_prep_ordem
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_prep_ordem();

CREATE INDEX IF NOT EXISTS order_items_fila_idx
ON public.order_items (tenant_id, prep_status, prep_ordem);