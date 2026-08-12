import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, tenantDoUsuario } from "@/lib/auth-middleware";
import { faixaDaLoja } from "@/lib/relatorios";

/** Sugestões iniciais. Cada loja escolhe as suas no Admin. */
export const categoriasSaidaPadrao = [
  "Insumos",
  "Embalagem",
  "Manutenção",
  "Retirada",
  "Outros",
] as const;

const saidaSchema = z.object({
  description: z.string().trim().min(2, "Descreva a saída"),
  amount: z.number().positive("Valor precisa ser maior que zero"),
  /** categoria livre: a loja mantém a lista que faz sentido para ela */
  category: z.string().trim().max(40).optional().nullable(),
  /** de onde o dinheiro saiu: gaveta, PIX, cartão… */
  origem: z.enum(["cash", "pix", "debit", "credit", "other"]).default("cash"),
  /** dia do lançamento (ISO) — por padrão agora */
  occurred_at: z.string().optional(),
  /** número da operação gerado no aparelho: reenvio não duplica saída */
  client_op_id: z.string().min(6).max(80).optional(),
});

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const periodoSchema = z.object({
  /** dia único (compatibilidade) */
  dia: dia.optional(),
  /** intervalo YYYY-MM-DD … YYYY-MM-DD */
  de: dia.optional(),
  ate: dia.optional(),
  /** fuso da loja (getTimezoneOffset do navegador): o servidor roda em UTC */
  offsetMin: z.number().int().min(-900).max(900).default(0),
});

/** Saídas lançadas no período escolhido, mais recentes primeiro. */
export const listarSaidas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => periodoSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { inicio, fim } = faixaDaLoja(data.dia ?? data.de, data.dia ?? data.ate, data.offsetMin);
    const { data: linhas, error } = await context.supabase
      .from("expenses")
      .select("id, description, amount, category, occurred_at, origem")
      .gte("occurred_at", inicio)
      .lt("occurred_at", fim)
      .order("occurred_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (linhas ?? []).map((l) => ({
      id: l.id,
      description: l.description,
      amount: Number(l.amount ?? 0),
      category: l.category ?? "Sem categoria",
      occurred_at: l.occurred_at,
      origem: (l.origem ?? "cash") as "cash" | "pix" | "debit" | "credit" | "other",
    }));
  });

/** Lança uma saída na empresa do usuário logado. */
export const salvarSaida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saidaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const tenant = await tenantDoUsuario(context);

    /* Reenvio da fila offline: se já entrou, devolve a linha existente. */
    if (data.client_op_id) {
      const { data: repetida } = await supabase
        .from("expenses")
        .select("id, description, amount, category, occurred_at, origem")
        .eq("client_op_id", data.client_op_id)
        .maybeSingle();
      if (repetida) return { ...repetida, amount: Number(repetida.amount ?? 0) };
    }

    const { data: nova, error } = await supabase
      .from("expenses")
      .insert({
        tenant_id: tenant,
        description: data.description,
        amount: data.amount,
        category: data.category?.trim() || null,
        origem: data.origem,
        occurred_at: data.occurred_at ?? new Date().toISOString(),
        created_by: userId,
        client_op_id: data.client_op_id ?? null,
      })

      .select("id, description, amount, category, occurred_at, origem")
      .single();
    if (error) throw new Error(error.message);
    return { ...nova, amount: Number(nova.amount ?? 0) };
  });

/** Apaga uma saída. Pelas regras da loja, só dono/gerente consegue. */
export const excluirSaida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: apagadas, error } = await context.supabase
      .from("expenses")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!apagadas || apagadas.length === 0) {
      throw new Error("Só o dono ou gerente pode apagar lançamentos.");
    }
    return { ok: true };
  });
