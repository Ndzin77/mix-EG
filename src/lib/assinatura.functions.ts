import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth, tenantDoUsuario } from "@/lib/auth-middleware";

/**
 * Assinatura da loja. O sistema não cobra: quem cobra é a Kirvano. Aqui só
 * lemos o estado para avisar com antecedência — aviso cedo evita corte.
 */
export type EstadoAssinatura = {
  status: string;
  plano: string;
  valor: number;
  venceEm: string;
  /** dias inteiros de atraso (0 quando em dia) */
  atraso: number;
  /** dias que ainda faltam para o bloqueio (0 quando já bloqueou) */
  restam: number;
  bloqueado: boolean;
  emDia: boolean;
};

/** Tolerância da casa: sete dias depois do vencimento o acesso fecha. */
export const CARENCIA_DIAS = 7;

export function calcular(status: string, plano: string, valor: number, venceEm: string) {
  const dia = 86_400_000;
  const diff = Date.now() - new Date(venceEm).getTime();
  const atraso = Math.max(0, Math.floor(diff / dia));
  const cancelada = status === "canceled";
  const bloqueado = cancelada || atraso >= CARENCIA_DIAS;
  return {
    status,
    plano,
    valor,
    venceEm,
    atraso,
    restam: Math.max(0, CARENCIA_DIAS - atraso),
    bloqueado,
    emDia: !cancelada && atraso === 0,
  } satisfies EstadoAssinatura;
}

export const minhaAssinatura = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EstadoAssinatura> => {
    const tenant = await tenantDoUsuario(context);
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select("status, plan, price, current_period_end")
      .eq("tenant_id", tenant)
      .maybeSingle();
    if (error) throw new Error(error.message);
    /* Sem linha ainda: trata como cortesia de 7 dias a partir de agora. */
    if (!data) {
      return calcular(
        "trialing",
        "mensal",
        39.9,
        new Date(Date.now() + CARENCIA_DIAS * 86_400_000).toISOString(),
      );
    }
    return calcular(
      data.status,
      data.plan,
      Number(data.price ?? 39.9),
      data.current_period_end as string,
    );
  });

/** Link do checkout, para o botão "Pagar agora" do aviso. */
export const linkCheckout = createServerFn({ method: "GET" }).handler(async () => {
  return { url: process.env["KIRVANO_CHECKOUT_URL"] ?? "" };
});
