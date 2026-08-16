import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { exigirAssinatura } from "@/lib/assinatura-guard";

/**
 * Fila de preparo: o bilhete de papel vira uma tela. O vendedor anota a
 * comanda no PDV e o ajudante vê aqui, na ordem em que chegou — ou na ordem
 * que a bancada arrastou.
 */
export type EtapaPreparo = "todo" | "doing" | "done" | "delivered";

const linha =
  "id, product_name, quantity, prep_status, prep_ordem, created_at, prep_started_at, prep_done_at, order_id, orders!inner(label, status), products(image_url)";

type Bruto = {
  id: string;
  product_name: string;
  quantity: number | string;
  prep_status: string | null;
  prep_ordem: number | null;
  created_at: string;
  prep_started_at: string | null;
  order_id: string;
  orders: { label: string; status: string } | { label: string; status: string }[] | null;
  products: { image_url: string | null } | { image_url: string | null }[] | null;
};

const um = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Bruto do banco → item da bancada, já ordenado pela mão de quem arrasta. */
export function montarFila(bruto: Bruto[]) {
  return bruto
    .filter((l) => {
      const o = um(l.orders);
      return o?.status === "open" || o?.status === "paid";
    })
    .map((l) => ({
      id: l.id,
      orderId: l.order_id,
      conta: um(l.orders)?.label ?? "Comanda",
      produto: l.product_name,
      quantidade: Number(l.quantity ?? 1),
      etapa: (l.prep_status ?? "todo") as EtapaPreparo,
      ordem: l.prep_ordem == null ? null : Number(l.prep_ordem),
      criadoEm: l.created_at,
      iniciadoEm: l.prep_started_at,
      foto: um(l.products)?.image_url ?? null,
    }))
    .sort((a, b) => {
      /* Uma régua só: posição da bancada e hora de chegada vivem na mesma
         escala (segundos desde a base), senão arrastar não segura o lugar. */
      const oa = a.ordem ?? posicaoPadrao(a.criadoEm);
      const ob = b.ordem ?? posicaoPadrao(b.criadoEm);
      if (oa !== ob) return oa - ob;
      return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
    });
}

/** Base compartilhada com o banco: segundos desde 2025-06-15. */
const BASE_FILA = 1_750_000_000;
const posicaoPadrao = (criadoEm: string) =>
  new Date(criadoEm).getTime() / 1000 - BASE_FILA;

export type ItemPreparo = ReturnType<typeof montarFila>[number];

/** Janela da bancada: só o movimento das últimas 12h. */
export const desde12h = () => new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
export const colunasFila = linha;

/** Itens que ainda precisam ser montados ou entregues, na ordem da bancada. */
export const listarPreparo = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("order_items")
      .select(linha)
      .gte("created_at", desde12h())
      .neq("prep_status", "delivered")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return montarFila((data ?? []) as unknown as Bruto[]);
  });

/** Carimbo de hora de cada etapa — mesma regra na bancada logada e na pública. */
export function patchEtapa(etapa: EtapaPreparo) {
  const agora = new Date().toISOString();
  const patch: {
    prep_status: string;
    prep_started_at?: string | null;
    prep_done_at?: string | null;
    delivered_at?: string | null;
  } = { prep_status: etapa };
  if (etapa === "doing") patch.prep_started_at = agora;
  if (etapa === "done") patch.prep_done_at = agora;
  if (etapa === "delivered") patch.delivered_at = agora;
  if (etapa === "todo") {
    patch.prep_started_at = null;
    patch.prep_done_at = null;
  }
  return patch;
}

const esquemaEtapa = z.object({
  id: z.string().uuid(),
  etapa: z.enum(["todo", "doing", "done", "delivered"]),
});

const esquemaOrdem = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/** Move o item de etapa e carimba a hora — o cronômetro sai daqui. */
export const marcarPreparo = createServerFn({ method: "POST" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => esquemaEtapa.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("order_items")
      .update(patchEtapa(data.etapa))
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Os lugares que esses itens já ocupam na fila, do menor para o maior.
 *  Redistribuir esses mesmos números mantém a coluna dentro do seu espaço. */
async function lugaresDaFila(
  db: { from: (t: "order_items") => any },
  ids: string[],
): Promise<number[]> {
  const { data, error } = await db
    .from("order_items")
    .select("id, prep_ordem, created_at")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as { id: string; prep_ordem: number | null; created_at: string }[];
  const lugares = ids.map((id) => {
    const l = linhas.find((x) => x.id === id);
    if (!l) return posicaoPadrao(new Date().toISOString());
    return l.prep_ordem == null ? posicaoPadrao(l.created_at) : Number(l.prep_ordem);
  });
  return lugares.sort((a, b) => a - b);
}

/** Ordem manual: os lugares que esses itens já ocupam são redistribuídos na
 *  ordem arrastada. Assim a coluna muda de ordem sem furar a fila das outras. */

export const reordenarPreparo = createServerFn({ method: "POST" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => esquemaOrdem.parse(input))
  .handler(async ({ data, context }) => {
    const lugares = await lugaresDaFila(context.supabase, data.ids);
    await Promise.all(
      data.ids.map((id, i) =>
        context.supabase
          .from("order_items")
          .update({ prep_ordem: lugares[i]! })
          .eq("id", id),
      ),
    );
    return { ok: true };
  });

/* ---------- bancada compartilhada (link + senha) ---------- */

/** Link e senha da bancada. Só quem já está logado na loja configura. */
export const configurarBancada = createServerFn({ method: "POST" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) =>
    z
      .object({ senha: z.string().min(4).max(64).optional(), novoLink: z.boolean().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { criarTrava } = await import("@/lib/travas");
    const patch: {
      preparo_senha?: { hash: string; salt: string };
      preparo_token?: string;
      preparo_ativo?: boolean;
    } = {};
    if (data.senha) patch.preparo_senha = await criarTrava(data.senha);
    if (data.novoLink) patch.preparo_token = crypto.randomUUID().replace(/-/g, "");
    /* Gerar link ou senha já liga a bancada: senão o link nasce morto. */
    patch.preparo_ativo = true;

    const { data: linhaLoja, error } = await context.supabase
      .from("store_settings")
      .update(patch)
      .neq("tenant_id", "00000000-0000-0000-0000-000000000000")
      .select("preparo_token, preparo_senha")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      token: linhaLoja?.preparo_token ?? null,
      temSenha: Boolean((linhaLoja?.preparo_senha as { hash?: string } | null)?.hash),
    };
  });

/** Estado atual do compartilhamento, para o cartão do Admin. */
export const statusBancada = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_settings")
      .select("preparo_token, preparo_senha")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      token: data?.preparo_token ?? null,
      temSenha: Boolean((data?.preparo_senha as { hash?: string } | null)?.hash),
    };
  });

const esquemaAcesso = z.object({
  token: z.string().min(8).max(64),
  senha: z.string().min(1).max(64),
});

/** Fila vista pelo aparelho convidado: exige link certo + senha certa. */
export const listarBancada = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => esquemaAcesso.parse(input))
  .handler(async ({ data }) => {
    const { tenantDaBancada } = await import("@/lib/bancada.server");
    const tenant = await tenantDaBancada(data.token, data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: linhas, error } = await supabaseAdmin
      .from("order_items")
      .select(linha)
      .eq("tenant_id", tenant)
      .gte("created_at", desde12h())
      .neq("prep_status", "delivered")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return montarFila((linhas ?? []) as unknown as Bruto[]);
  });

/** Mesmo botão de etapa, do lado convidado. */
export const marcarBancada = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => esquemaAcesso.merge(esquemaEtapa).parse(input))
  .handler(async ({ data }) => {
    const { tenantDaBancada } = await import("@/lib/bancada.server");
    const tenant = await tenantDaBancada(data.token, data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("order_items")
      .update(patchEtapa(data.etapa))
      .eq("id", data.id)
      .eq("tenant_id", tenant);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Ordem arrastada no aparelho convidado. */
export const reordenarBancada = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => esquemaAcesso.merge(esquemaOrdem).parse(input))
  .handler(async ({ data }) => {
    const { tenantDaBancada } = await import("@/lib/bancada.server");
    const tenant = await tenantDaBancada(data.token, data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lugares = await lugaresDaFila(supabaseAdmin, data.ids);
    await Promise.all(
      data.ids.map((id, i) =>
        supabaseAdmin
          .from("order_items")
          .update({ prep_ordem: lugares[i]! })
          .eq("id", id)
          .eq("tenant_id", tenant),
      ),
    );
    return { ok: true };
  });
