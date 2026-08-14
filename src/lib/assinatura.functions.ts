import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth, tenantDoUsuario } from "@/lib/auth-middleware";
import { esquecerAssinatura } from "@/lib/assinatura-guard";
import {
  calcular,
  dadosDaCompra,
  linkPagamento,
  PLANO_URL,
  PRECO_MENSAL,
} from "@/lib/assinatura";
import type { EstadoAssinatura } from "@/lib/assinatura";

/**
 * Assinatura da loja. O sistema não cobra: quem cobra é a Kirvano. Aqui só
 * lemos o estado para avisar com antecedência — aviso cedo evita corte.
 */

export const minhaAssinatura = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EstadoAssinatura> => {
    const tenant = await tenantDoUsuario(context);
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select("status, plan, price, current_period_end, buyer_email, last_event, updated_at")
      .eq("tenant_id", tenant)
      .maybeSingle();
    if (error) throw new Error(error.message);
    /* Sem pagamento confirmado: estado pendente, nunca uma cortesia inventada. */
    if (!data) {
      return calcular(
        "pending",
        "mensal",
        PRECO_MENSAL,
        new Date(0).toISOString(),
      );
    }
    return calcular(
      data.status,
      data.plan,
      Number(data.price ?? PRECO_MENSAL),
      data.current_period_end as string,
      {
        email: (data.buyer_email as string | null) ?? null,
        ultimoEvento: (data.last_event as string | null) ?? null,
        confirmadoEm: (data.updated_at as string | null) ?? null,
      },
    );
  });

/** Link do checkout, já preenchido com quem está logado. */
export const linkCheckout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const base = process.env["KIRVANO_CHECKOUT_URL"] || PLANO_URL;
    const claims = context.claims as { email?: string; user_metadata?: { full_name?: string } };
    return {
      url: linkPagamento(base, {
        email: claims.email ?? null,
        nome: claims.user_metadata?.full_name ?? null,
      }),
    };
  });

/**
 * Conserto de rota: quem pagou antes de confirmar o e-mail (ou antes da conta
 * existir) tinha o aviso da Kirvano descartado. Agora o evento fica guardado
 * e é aplicado no primeiro acesso — o pagamento nunca se perde. Também
 * termina o cadastro vindo da landing (nome da loja e telefone).
 */
export const sincronizarConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenant = await tenantDoUsuario(context);
    const claims = context.claims as {
      email?: string;
      user_metadata?: { full_name?: string; store_name?: string; phone?: string };
    };
    const email = (claims.email ?? "").toLowerCase();
    const meta = claims.user_metadata ?? {};
    /* A tabela de eventos é nova: os tipos gerados podem não conhecê-la. */
    const db = context.supabase as unknown as {
      from: (t: string) => any;
    };

    /* 1) Cadastro da landing: aplica nome/telefone se ainda estão no padrão. */
    if (meta.store_name || meta.phone) {
      const { data: loja } = await db
        .from("store_settings")
        .select("store_name, phone")
        .eq("tenant_id", tenant)
        .maybeSingle();
      const semNome = !loja?.store_name || /minha loja|loja$/i.test(String(loja.store_name));
      const patch: Record<string, unknown> = {};
      if (meta.store_name && semNome) patch["store_name"] = meta.store_name;
      if (meta.phone && !loja?.phone) patch["phone"] = meta.phone;
      if (Object.keys(patch).length) {
        await db.from("store_settings").update(patch).eq("tenant_id", tenant);
      }
    }

    /* 2) Pagamentos guardados: aplica o mais recente e marca como usado. */
    let aplicado: string | null = null;
    if (email) {
      const { data: eventos } = await db
        .from("kirvano_events")
        .select("id, event, next_charge_date, payload, created_at")
        .is("processed_at", null)
        .ilike("buyer_email", email)
        .order("created_at", { ascending: false })
        .limit(20);

      const lista: {
        id: string;
        event: string;
        next_charge_date: string | null;
        payload?: unknown;
      }[] = eventos ?? [];
      const pago = lista.find((e) =>
        ["SALE_APPROVED", "SUBSCRIPTION_APPROVED", "SUBSCRIPTION_RENEWED"].includes(
          (e.event ?? "").toUpperCase(),
        ),
      );
      if (pago) {
        const compra = dadosDaCompra(pago.payload);
        /* A tabela de assinaturas não aceita escrita do usuário logado (só
           leitura). Sem a chave de serviço, o pagamento guardado nunca era
           aplicado — e a pessoa continuava vendo "Aguardando pagamento". */
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as unknown as { from: (t: string) => any };
        const { error: erroUpsert } = await admin.from("subscriptions").upsert(
          {
            tenant_id: tenant,
            status: "active",
            plan: "mensal",
            price: PRECO_MENSAL,
            buyer_email: email,
            last_event: pago.event,
            current_period_end:
              (pago.next_charge_date ? new Date(pago.next_charge_date).toISOString() : null) ??
              compra.proxima ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" },
        );
        if (erroUpsert) throw new Error(erroUpsert.message);
        aplicado = pago.event;
        /* Pagamento acabou de entrar: a trava precisa esquecer o "não". */
        esquecerAssinatura(tenant);
      }
      if (lista.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as unknown as { from: (t: string) => any };
        await admin
          .from("kirvano_events")
          .update({ processed_at: new Date().toISOString(), tenant_id: tenant })
          .in(
            "id",
            lista.map((e) => e.id),
          );
      }
    }

    return { ok: true as const, aplicado };
  });

/**
 * Prova concreta do que a Kirvano mandou. Dúvida de "eu paguei" acaba com
 * fato na tela: cada aviso recebido, com data e nome amigável.
 */
export const eventosKirvano = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenant = await tenantDoUsuario(context);
    const claims = context.claims as { email?: string };
    const email = (claims.email ?? "").toLowerCase();
    const db = context.supabase as unknown as { from: (t: string) => any };

    let consulta = db
      .from("kirvano_events")
      .select("id, event, created_at, buyer_email")
      .order("created_at", { ascending: false })
      .limit(8);
    consulta = email
      ? consulta.or(`tenant_id.eq.${tenant},buyer_email.ilike.${email}`)
      : consulta.eq("tenant_id", tenant);

    const { data } = await consulta;
    const lista: { id: string; event: string; created_at: string }[] = data ?? [];
    return {
      /* O token vive só no servidor: a tela mostra apenas se ele existe. */
      tokenConfigurado: !!process.env["KIRVANO_WEBHOOK_TOKEN"],
      eventos: lista.map((e) => ({ id: e.id, evento: e.event, quando: e.created_at })),
    };
  });
