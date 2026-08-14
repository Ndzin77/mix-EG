CREATE OR REPLACE FUNCTION public.kirvano(jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  p jsonb := $1;
  token_esperado text := 'rv@n0)-!ÇaçK1';
  token_enviado text;
  cabecalhos json;
  email text;
  evento text;
  data_txt text;
  proxima timestamptz;
  tenant uuid;
  novo_status text;
  fim timestamptz;
BEGIN
  BEGIN
    cabecalhos := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    cabecalhos := NULL;
  END;

  token_enviado := coalesce(cabecalhos->>'security-token', cabecalhos->>'x-kirvano-token', '');
  IF token_enviado IS DISTINCT FROM token_esperado THEN
    RAISE EXCEPTION 'Invalid token' USING ERRCODE = '42501';
  END IF;

  email := lower(trim(coalesce(p->'customer'->>'email', '')));
  evento := upper(coalesce(p->>'event', p->>'status', ''));
  IF email = '' THEN
    RAISE EXCEPTION 'Missing customer email' USING ERRCODE = '22023';
  END IF;

  data_txt := coalesce(
    p->'plan'->>'next_charge_date',
    p->'subscription'->>'next_charge_date',
    p->>'next_charge_date',
    p->'subscription'->>'charge_date'
  );
  IF data_txt IS NOT NULL AND btrim(data_txt) <> '' THEN
    BEGIN
      IF data_txt ~ '^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}' THEN
        proxima := (replace(btrim(data_txt), 'T', ' ') || ' -03')::timestamptz;
      ELSE
        proxima := btrim(data_txt)::timestamptz;
      END IF;
    EXCEPTION WHEN others THEN
      proxima := NULL;
    END;
  END IF;

  SELECT pr.tenant_id INTO tenant FROM public.profiles pr WHERE lower(pr.email) = email LIMIT 1;
  IF tenant IS NULL THEN
    SELECT s.tenant_id INTO tenant FROM public.subscriptions s WHERE lower(s.buyer_email) = email LIMIT 1;
  END IF;

  INSERT INTO public.kirvano_events (buyer_email, event, tenant_id, next_charge_date, payload)
  VALUES (email, evento, tenant, proxima, p);

  IF tenant IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'pendente', 'conta ainda não criada');
  END IF;

  novo_status := CASE
    WHEN evento IN ('SALE_APPROVED','SUBSCRIPTION_RENEWED','SUBSCRIPTION_APPROVED') THEN 'active'
    WHEN evento IN ('SALE_REFUNDED','SALE_CHARGEBACK','SUBSCRIPTION_CANCELED','SUBSCRIPTION_CANCELLED','SUBSCRIPTION_EXPIRED') THEN 'canceled'
    WHEN evento IN ('SUBSCRIPTION_LATE','SALE_REFUSED','ABANDONED_CART') THEN 'past_due'
    ELSE NULL
  END;

  IF novo_status IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'ignorado', evento);
  END IF;

  IF novo_status = 'past_due' THEN
    SELECT s.current_period_end INTO fim FROM public.subscriptions s WHERE s.tenant_id = tenant;
    IF fim IS NOT NULL AND fim > now() THEN
      RETURN jsonb_build_object('ok', true, 'ignorado', 'ainda dentro do período pago');
    END IF;
  END IF;

  INSERT INTO public.subscriptions AS s (
    tenant_id, status, buyer_email, last_event, kirvano_subscription_id, plan, price, current_period_end, updated_at
  ) VALUES (
    tenant,
    novo_status,
    email,
    evento,
    nullif(p->'subscription'->>'id', ''),
    CASE WHEN novo_status = 'active' THEN 'mensal' ELSE 'mensal' END,
    CASE WHEN novo_status = 'active' THEN 39.90 ELSE 39.90 END,
    CASE WHEN novo_status = 'active' THEN coalesce(proxima, now() + interval '30 days') ELSE now() END,
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

  UPDATE public.kirvano_events
     SET processed_at = now()
   WHERE lower(buyer_email) = email AND processed_at IS NULL;

  RETURN jsonb_build_object('ok', true, 'status', novo_status);
END;
$fn$;

REVOKE ALL ON FUNCTION public.kirvano(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kirvano(jsonb) TO anon, authenticated, service_role;