DROP FUNCTION IF EXISTS public.kirvano(jsonb);
DROP FUNCTION IF EXISTS public.kirvano(p jsonb);

CREATE OR REPLACE FUNCTION public.kirvano(jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p jsonb := $1;
  v_token_esperado text := 'rv@n0)-!PapK1';
  v_token text;
  v_cab json;
  v_email text;
  v_evento text;
  v_data text;
  v_proxima timestamptz;
  v_tenant uuid;
  v_status text;
  v_fim timestamptz;
BEGIN
  BEGIN
    v_cab := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    v_cab := NULL;
  END;

  v_token := coalesce(v_cab->>'security-token', v_cab->>'x-kirvano-token', '');
  IF v_token IS DISTINCT FROM v_token_esperado THEN
    RAISE EXCEPTION 'Invalid token' USING ERRCODE = '42501';
  END IF;

  v_email := lower(trim(coalesce(p->'customer'->>'email', '')));
  v_evento := upper(coalesce(p->>'event', p->>'status', ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'Missing customer email' USING ERRCODE = '22023';
  END IF;

  v_data := coalesce(
    p->'plan'->>'next_charge_date',
    p->'subscription'->>'next_charge_date',
    p->>'next_charge_date',
    p->'subscription'->>'charge_date'
  );
  IF v_data IS NOT NULL AND btrim(v_data) <> '' THEN
    BEGIN
      IF v_data ~ '^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}' THEN
        v_proxima := (replace(btrim(v_data), 'T', ' ') || ' -03')::timestamptz;
      ELSE
        v_proxima := btrim(v_data)::timestamptz;
      END IF;
    EXCEPTION WHEN others THEN
      v_proxima := NULL;
    END;
  END IF;

  SELECT pr.tenant_id INTO v_tenant FROM public.profiles pr WHERE lower(pr.email) = v_email LIMIT 1;
  IF v_tenant IS NULL THEN
    SELECT s.tenant_id INTO v_tenant FROM public.subscriptions s WHERE lower(s.buyer_email) = v_email LIMIT 1;
  END IF;

  INSERT INTO public.kirvano_events (buyer_email, event, tenant_id, next_charge_date, payload)
  VALUES (v_email, v_evento, v_tenant, v_proxima, p);

  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'pendente', 'conta ainda não criada');
  END IF;

  v_status := CASE
    WHEN v_evento IN ('SALE_APPROVED','SUBSCRIPTION_RENEWED','SUBSCRIPTION_APPROVED') THEN 'active'
    WHEN v_evento IN ('SALE_REFUNDED','SALE_CHARGEBACK','SUBSCRIPTION_CANCELED','SUBSCRIPTION_CANCELLED','SUBSCRIPTION_EXPIRED') THEN 'canceled'
    WHEN v_evento IN ('SUBSCRIPTION_LATE','SALE_REFUSED','ABANDONED_CART') THEN 'past_due'
    ELSE NULL
  END;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'ignorado', v_evento);
  END IF;

  IF v_status = 'past_due' THEN
    SELECT s.current_period_end INTO v_fim FROM public.subscriptions s WHERE s.tenant_id = v_tenant;
    IF v_fim IS NOT NULL AND v_fim > now() THEN
      RETURN jsonb_build_object('ok', true, 'ignorado', 'ainda dentro do período pago');
    END IF;
  END IF;

  INSERT INTO public.subscriptions AS s (
    tenant_id, status, buyer_email, last_event, kirvano_subscription_id, plan, price, current_period_end, updated_at
  ) VALUES (
    v_tenant, v_status, v_email, v_evento,
    nullif(p->'subscription'->>'id', ''),
    'mensal', 39.90,
    CASE WHEN v_status = 'active' THEN coalesce(v_proxima, now() + interval '30 days') ELSE now() END,
    now()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    status = EXCLUDED.status,
    buyer_email = EXCLUDED.buyer_email,
    last_event = EXCLUDED.last_event,
    kirvano_subscription_id = coalesce(EXCLUDED.kirvano_subscription_id, s.kirvano_subscription_id),
    plan = CASE WHEN EXCLUDED.status = 'active' THEN 'mensal' ELSE s.plan END,
    price = CASE WHEN EXCLUDED.status = 'active' THEN 39.90 ELSE s.price END,
    current_period_end = CASE WHEN EXCLUDED.status = 'active' THEN EXCLUDED.current_period_end ELSE s.current_period_end END,
    updated_at = now();

  UPDATE public.kirvano_events ke
     SET processed_at = now()
   WHERE lower(ke.buyer_email) = v_email AND ke.processed_at IS NULL;

  RETURN jsonb_build_object('ok', true, 'status', v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.kirvano(jsonb) TO authenticated, anon, service_role;
