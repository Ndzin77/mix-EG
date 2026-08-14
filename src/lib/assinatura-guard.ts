import { createMiddleware } from "@tanstack/react-start";

import { requireSupabaseAuth, tenantDoUsuario } from "@/lib/auth-middleware";
import { calcular } from "@/lib/assinatura";

/**
 * Trava de verdade: esconder a tela não basta, porque as funções do servidor
 * respondem por conta própria. Aqui a loja sem pagamento confirmado (ou já
 * passada a tolerância) leva um "não" antes de qualquer leitura ou gravação.
 *
 * Fica fora de `*.server.ts` de propósito: este arquivo é importado no topo
 * das funções, e o nome `.server.` é barrado no empacotamento do navegador.
 */

const MOTIVO = "Pagamento pendente. Regularize a assinatura para usar o sistema.";

/* Uma ida ao banco por clique seria caro: o resultado vale alguns minutos. */
const VALIDADE = 3 * 60_000;
const cache = new Map<string, { liberado: boolean; ate: number }>();

export async function lojaLiberada(
  supabase: { from: (t: string) => any },
  tenant: string,
): Promise<boolean> {
  const guardado = cache.get(tenant);
  if (guardado && guardado.ate > Date.now()) return guardado.liberado;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, plan, price, current_period_end, last_event")
    .eq("tenant_id", tenant)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const liberado = data
    ? !calcular(
        data.status,
        data.plan,
        Number(data.price ?? 0),
        data.current_period_end as string,
        { ultimoEvento: (data.last_event as string | null) ?? null },
      ).bloqueado
    : false;

  if (cache.size > 500) cache.clear();
  cache.set(tenant, { liberado, ate: Date.now() + VALIDADE });
  return liberado;
}

/** Esquece a decisão guardada (usado quando um pagamento acaba de entrar). */
export function esquecerAssinatura(tenant: string) {
  cache.delete(tenant);
}

export const exigirAssinatura = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const tenant = await tenantDoUsuario(context);
    if (!(await lojaLiberada(context.supabase as never, tenant))) throw new Error(MOTIVO);
    return next({ context: { tenant } });
  });
