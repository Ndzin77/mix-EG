CREATE TABLE public.subscriptions (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'trialing',
  plan text NOT NULL DEFAULT 'mensal',
  price numeric NOT NULL DEFAULT 39.90,
  current_period_end timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  buyer_email text,
  kirvano_customer_id text,
  kirvano_subscription_id text,
  last_event text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id());

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX subscriptions_kirvano_sub_idx ON public.subscriptions (kirvano_subscription_id);
CREATE INDEX subscriptions_email_idx ON public.subscriptions (buyer_email);

INSERT INTO public.subscriptions (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;