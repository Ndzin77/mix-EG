CREATE TABLE public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method payment_method NOT NULL DEFAULT 'cash',
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_payments_order_id_idx ON public.order_payments (order_id);
CREATE INDEX order_payments_tenant_idx ON public.order_payments (tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_payments_select ON public.order_payments FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id());
CREATE POLICY order_payments_insert ON public.order_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY order_payments_update ON public.order_payments FOR UPDATE TO authenticated
  USING (tenant_id = private.current_tenant_id())
  WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY order_payments_delete ON public.order_payments FOR DELETE TO authenticated
  USING (tenant_id = private.current_tenant_id());