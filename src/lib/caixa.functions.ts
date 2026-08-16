import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { exigirAssinatura } from "@/lib/assinatura-guard";
import { tenantDoUsuario } from "@/lib/auth-middleware";
import { arred, faixaDaLoja } from "@/lib/relatorios";
import { somarFormas, type PedidoBase, type ParteBanco } from "@/lib/pagamentos";

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const periodo = z.object({
  de: dia.optional(),
  ate: dia.optional(),
  offsetMin: z.number().int().min(-900).max(900).default(0),
});

const ajuste = z.object({
  kind: z.enum(["entrada", "saida"]),
  amount: z.number().positive("Valor precisa ser maior que zero"),
  note: z.string().trim().max(80).optional().nullable(),
  occurred_at: z.string().optional(),
});

/** Ajustes de gaveta (entrada/saída de dinheiro físico) do período. */
export const listarAjustesGaveta = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => periodo.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { inicio, fim } = faixaDaLoja(data.de, data.ate, data.offsetMin);
    const { data: linhas, error } = await context.supabase
      .from("cash_moves")
      .select("id, kind, amount, note, occurred_at")
      .gte("occurred_at", inicio)
      .lt("occurred_at", fim)
      .order("occurred_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (linhas ?? []).map((l) => ({
      id: l.id as string,
      kind: (l.kind ?? "entrada") as "entrada" | "saida",
      amount: arred(Number(l.amount ?? 0)),
      note: (l.note ?? "") as string,
      occurred_at: l.occurred_at as string,
    }));
  });

/** Quanto de dinheiro físico sobrou de tudo o que aconteceu ANTES do período:
 *  vendas em dinheiro − saídas em dinheiro + entradas de gaveta − retiradas.
 *  É esse número que faz o caixa de hoje já abrir com o troco de ontem. */
export const saldoGavetaAnterior = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => periodo.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { inicio } = faixaDaLoja(data.de, data.ate, data.offsetMin);
    const { supabase } = context;

    const [pagos, saidas, moves] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total, payment_method, payment_method_2, amount_2")
        .eq("status", "paid")
        .lt("closed_at", inicio),
      supabase.from("expenses").select("amount, origem").lt("occurred_at", inicio),
      supabase.from("cash_moves").select("kind, amount").lt("occurred_at", inicio),
    ]);
    if (pagos.error) throw new Error(pagos.error.message);
    if (saidas.error) throw new Error(saidas.error.message);
    if (moves.error) throw new Error(moves.error.message);

    const pedidos = (pagos.data ?? []) as PedidoBase[];
    let partes: ParteBanco[] = [];
    if (pedidos.length) {
      const { data: linhas, error } = await supabase
        .from("order_payments")
        .select("order_id, method, amount")
        .in(
          "order_id",
          pedidos.map((o) => o.id),
        );
      if (error) throw new Error(error.message);
      partes = (linhas ?? []) as never;
    }
    const entrouEmDinheiro = somarFormas(pedidos, partes).cash ?? 0;

    const saiuEmDinheiro = (saidas.data ?? [])
      .filter((s) => ((s as { origem?: string | null }).origem ?? "cash") === "cash")
      .reduce((t, s) => t + Number(s.amount ?? 0), 0);

    const ajustes = (moves.data ?? []).reduce(
      (t, m) => t + (m.kind === "saida" ? -1 : 1) * Number(m.amount ?? 0),
      0,
    );

    return { saldo: arred(entrouEmDinheiro - saiuEmDinheiro + ajustes) };
  });

/** Lança dinheiro que entrou na gaveta (troco inicial, aporte) ou que saiu
 *  dela (sangria, depósito). Não é faturamento nem despesa: só gaveta. */
export const salvarAjusteGaveta = createServerFn({ method: "POST" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => ajuste.parse(input))
  .handler(async ({ data, context }) => {
    const tenant = await tenantDoUsuario(context);
    const { data: nova, error } = await context.supabase
      .from("cash_moves")
      .insert({
        tenant_id: tenant,
        kind: data.kind,
        amount: data.amount,
        note: data.note?.trim() || null,
        occurred_at: data.occurred_at ?? new Date().toISOString(),
        created_by: context.userId,
      })
      .select("id, kind, amount, note, occurred_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...nova, amount: arred(Number(nova.amount ?? 0)) };
  });

/** Desfaz um ajuste lançado por engano. */
export const excluirAjusteGaveta = createServerFn({ method: "POST" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: apagadas, error } = await context.supabase
      .from("cash_moves")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!apagadas?.length) throw new Error("Não foi possível desfazer esse lançamento.");
    return { ok: true };
  });
