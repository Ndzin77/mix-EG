CREATE TABLE public.cash_moves (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null default 'entrada',
  amount numeric not null default 0,
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid,
  client_op_id text,
  created_at timestamptz not null default now()
);

CREATE INDEX cash_moves_tenant_data_idx ON public.cash_moves (tenant_id, occurred_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_moves TO authenticated;
GRANT ALL ON public.cash_moves TO service_role;

ALTER TABLE public.cash_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY cash_moves_select ON public.cash_moves FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id());
CREATE POLICY cash_moves_insert ON public.cash_moves FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.current_tenant_id() AND kind IN ('entrada','saida') AND amount > 0);
CREATE POLICY cash_moves_update ON public.cash_moves FOR UPDATE TO authenticated
  USING (tenant_id = private.current_tenant_id())
  WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY cash_moves_delete ON public.cash_moves FOR DELETE TO authenticated
  USING (tenant_id = private.current_tenant_id());