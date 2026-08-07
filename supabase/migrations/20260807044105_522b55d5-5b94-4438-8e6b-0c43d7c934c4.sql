ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_op_id text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS client_op_id text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS client_op_id text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_op_id_uidx
  ON public.orders (tenant_id, client_op_id)
  WHERE client_op_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS order_items_client_op_id_uidx
  ON public.order_items (tenant_id, client_op_id)
  WHERE client_op_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS expenses_client_op_id_uidx
  ON public.expenses (tenant_id, client_op_id)
  WHERE client_op_id IS NOT NULL;