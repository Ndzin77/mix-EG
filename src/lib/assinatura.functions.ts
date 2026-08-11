import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth, tenantDoUsuario } from "@/lib/auth-middleware";
import { CARENCIA_DIAS, calcular, linkPagamento, PLANO_URL, PRECO_MENSAL } from "@/lib/assinatura";
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
    /* Sem linha ainda: trata como cortesia de 7 dias a partir de agora. */
    if (!data) {
      return calcular(
        "trialing",
        "mensal",
        PRECO_MENSAL,
        new Date(Date.now() + CARENCIA_DIAS * 86_400_000).toISOString(),
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
