import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { somarFormas, type ParteBanco, type PedidoBase } from "@/lib/pagamentos";
import type { ReciboDados } from "@/lib/recibo";

const itemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  product_name: z.string().min(1),
  unit_price: z.number().min(0),
  quantity: z.number().min(0.001),
});

const formaSchema = z.enum(["cash", "debit", "credit", "pix", "other"]);

const pedidoSchema = z.object({
  id: z.string().uuid().optional(),
  /** número da operação gerado no aparelho: reenvio não duplica venda */
  client_op_id: z.string().min(6).max(80).optional(),
  label: z.string().min(1).default("Comanda"),
  status: z.enum(["open", "paid", "cancelled"]).default("paid"),
  payment_method: formaSchema.nullable().optional(),
  /** desconto em reais aplicado no fechamento */
  discount: z.number().min(0).default(0),
  /** segunda forma de pagamento quando o cliente divide a conta */
  payment_method_2: formaSchema.nullable().optional(),
  amount_2: z.number().min(0).nullable().optional(),
  /** conta dividida em quantas formas o cliente quiser */
  payments: z.array(z.object({ method: formaSchema, amount: z.number().min(0) })).default([]),
  /** quanto o cliente entregou em dinheiro (só para o recibo) */
  received: z.number().min(0).nullable().optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

export type PedidoInput = z.infer<typeof pedidoSchema>;

const itensSchema = z.object({
  order_id: z.string().uuid(),
  client_op_id: z.string().min(6).max(80).optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});


/** Busca as partes de pagamento dos pedidos informados. */
async function partesDe(
  supabase: { from: (t: "order_payments") => any },
  ids: string[],
): Promise<ParteBanco[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("order_payments")
    .select("order_id, method, amount")
    .in("order_id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p: { order_id: string; method: ParteBanco["method"]; amount: number | string }) => ({
    order_id: p.order_id,
    method: p.method,
    amount: Number(p.amount ?? 0),
  }));
}



/** Comandas em aberto, com itens, para o painel lateral do PDV. */
export const listarComandas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, label, total, opened_at, order_items(id, product_id, product_name, unit_price, quantity)",
      )
      .eq("status", "open")
      .order("opened_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Fechamento do dia: entradas por forma, descontos, saídas e o líquido.
 *  Uma consulta por tabela; a conta é feita aqui para o cliente só desenhar. */
export const resumoCaixa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const primeiro = data.dia ?? data.de;
    const ultimo = data.dia ?? data.ate ?? primeiro;
    const inicio = new Date(primeiro ? `${primeiro}T00:00:00` : new Date());
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(ultimo ? `${ultimo}T00:00:00` : inicio);
    fim.setHours(0, 0, 0, 0);
    fim.setDate(fim.getDate() + 1);

    const [pagos, abertos, saidas] = await Promise.all([
      context.supabase
        .from("orders")
        .select("id, total, discount, payment_method, payment_method_2, amount_2")
        .eq("status", "paid")
        .gte("closed_at", inicio.toISOString())
        .lt("closed_at", fim.toISOString()),
      context.supabase.from("orders").select("total").eq("status", "open"),
      context.supabase
        .from("expenses")
        .select("amount, category")
        .gte("occurred_at", inicio.toISOString())
        .lt("occurred_at", fim.toISOString()),
    ]);
    if (pagos.error) throw new Error(pagos.error.message);
    if (abertos.error) throw new Error(abertos.error.message);
    if (saidas.error) throw new Error(saidas.error.message);

    const linhasPagas = (pagos.data ?? []) as PedidoBase[];
    const partes = await partesDe(context.supabase as never, linhasPagas.map((o) => o.id));
    const formas = somarFormas(linhasPagas, partes);

    let entradas = 0;
    let descontos = 0;
    for (const o of pagos.data ?? []) {
      entradas += Number(o.total ?? 0);
      descontos += Number(o.discount ?? 0);
    }


    const porCategoria: Record<string, number> = {};
    let totalSaidas = 0;
    for (const s of saidas.data ?? []) {
      const v = Number(s.amount ?? 0);
      totalSaidas += v;
      const cat = s.category ?? "Outros";
      porCategoria[cat] = (porCategoria[cat] ?? 0) + v;
    }

    const aberto = (abertos.data ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const arred = (n: number) => Math.round(n * 100) / 100;

    return {
      dia: inicio.toISOString().slice(0, 10),
      entradas: arred(entradas),
      vendas: pagos.data?.length ?? 0,
      descontos: arred(descontos),
      formas: {
        cash: arred(formas.cash ?? 0),
        pix: arred(formas.pix ?? 0),
        debit: arred(formas.debit ?? 0),
        credit: arred(formas.credit ?? 0),
        other: arred(formas.other ?? 0),
      },
      saidas: arred(totalSaidas),
      saidasPorCategoria: porCategoria,
      liquido: arred(entradas - totalSaidas),
      /** o que deve estar fisicamente na gaveta: vendas em dinheiro − retiradas */
      gaveta: arred((formas.cash ?? 0) - totalSaidas),
      aberto: arred(aberto),
      contasAbertas: abertos.data?.length ?? 0,
    };
  });


/** Cria ou atualiza um pedido (venda direta ou comanda) com seus itens. */
export const salvarPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pedidoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: perfil, error: erroPerfil } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (erroPerfil) throw new Error(erroPerfil.message);
    if (!perfil) throw new Error("Perfil da loja não encontrado.");

    /* Reenvio da fila offline: se essa operação já entrou, devolve o que existe
       em vez de gravar de novo. */
    if (data.client_op_id) {
      const { data: repetida } = await supabase
        .from("orders")
        .select("id, total")
        .eq("client_op_id", data.client_op_id)
        .maybeSingle();
      if (repetida) {
        return { id: repetida.id, total: Number(repetida.total ?? 0), recibo: null };
      }
    }



    const bruto = Math.round(data.items.reduce((s, i) => s + i.unit_price * i.quantity, 0) * 100) / 100;
    const desconto = Math.min(data.discount ?? 0, bruto);
    const total = Math.round((bruto - desconto) * 100) / 100;

    /* Partes do pagamento: o que veio da tela manda; sem detalhamento,
       a venda inteira cai na forma escolhida. */
    const pago = data.status === "paid";
    let partes = (data.payments ?? [])
      .map((p) => ({ method: p.method, amount: Math.round(p.amount * 100) / 100 }))
      .filter((p) => p.amount > 0);
    if (pago && !partes.length) {
      partes = [{ method: data.payment_method ?? "cash", amount: total }];
    }
    if (!pago) partes = [];

    const resto = Math.round((total - partes.reduce((s, p) => s + p.amount, 0)) * 100) / 100;
    if (pago && Math.abs(resto) >= 0.01 && partes.length) {
      /* Sobrou ou faltou centavo: ajusta na última parte para o caixa fechar. */
      const ultima = partes[partes.length - 1]!;
      ultima.amount = Math.round((ultima.amount + resto) * 100) / 100;
    }

    const complemento = partes.slice(1).reduce((s, p) => s + p.amount, 0);
    const fechadoEm = new Date().toISOString();
    const base = {
      tenant_id: perfil.tenant_id,
      label: data.label,
      status: data.status,
      payment_method: pago ? (partes[0]?.method ?? data.payment_method ?? "cash") : null,
      discount: desconto,
      payment_method_2: partes.length > 1 ? (partes[1]?.method ?? null) : null,
      amount_2: partes.length > 1 ? Math.round(complemento * 100) / 100 : 0,
      total,
      closed_at: pago ? fechadoEm : null,
      created_by: userId,
      client_op_id: data.client_op_id ?? null,
    };



    let orderId = data.id;
    if (orderId) {
      const { error } = await supabase.from("orders").update(base).eq("id", orderId);
      if (error) throw new Error(error.message);
      const { error: erroLimpar } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);
      if (erroLimpar) throw new Error(erroLimpar.message);
      const { error: erroLimparPag } = await supabase
        .from("order_payments")
        .delete()
        .eq("order_id", orderId);
      if (erroLimparPag) throw new Error(erroLimparPag.message);
    } else {
      const { data: novo, error } = await supabase
        .from("orders")
        .insert(base)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      orderId = novo.id;
    }

    const { error: erroItens } = await supabase.from("order_items").insert(
      data.items.map((i) => ({
        tenant_id: perfil.tenant_id,
        order_id: orderId!,
        product_id: i.product_id ?? null,
        product_name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: i.unit_price * i.quantity,
      })),
    );
    if (erroItens) throw new Error(erroItens.message);

    if (partes.length) {
      const { error: erroPag } = await supabase.from("order_payments").insert(
        partes.map((p) => ({
          tenant_id: perfil.tenant_id,
          order_id: orderId!,
          method: p.method,
          amount: p.amount,
        })),
      );
      if (erroPag) throw new Error(erroPag.message);
    }

    const emDinheiro = partes.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
    const recebido = data.received ?? null;
    const recibo: ReciboDados | null = pago
      ? {
          id: orderId!,
          label: data.label,
          data: fechadoEm,
          itens: data.items.map((i) => ({
            nome: i.product_name,
            qtd: i.quantity,
            unitario: i.unit_price,
            subtotal: Math.round(i.unit_price * i.quantity * 100) / 100,
          })),
          bruto,
          desconto,
          total,
          pagamentos: partes.map((p) => ({ forma: p.method, valor: p.amount })),
          recebido,
          troco:
            recebido !== null && emDinheiro > 0
              ? Math.round(Math.max(0, recebido - emDinheiro) * 100) / 100
              : null,
        }
      : null;

    return { id: orderId!, total, recibo };
  });

/** Recibo de uma venda já gravada — para a segunda via. */
export const reciboDaVenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ReciboDados> => {
    const { supabase } = context;
    const { data: pedido, error } = await supabase
      .from("orders")
      .select(
        "id, label, total, discount, payment_method, payment_method_2, amount_2, closed_at, opened_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pedido) throw new Error("Venda não encontrada.");

    const [{ data: itens, error: erroItens }, partes] = await Promise.all([
      supabase
        .from("order_items")
        .select("product_name, unit_price, quantity, subtotal")
        .eq("order_id", data.id),
      partesDe(supabase as never, [data.id]),
    ]);
    if (erroItens) throw new Error(erroItens.message);

    const total = Number(pedido.total ?? 0);
    const desconto = Number(pedido.discount ?? 0);
    const pagamentos = partes.length
      ? partes.map((p) => ({ forma: p.method, valor: p.amount }))
      : (() => {
          const segundo = Math.min(Number(pedido.amount_2 ?? 0), total);
          const lista = [
            {
              forma: (pedido.payment_method ?? "other") as ParteBanco["method"],
              valor: Math.round((total - (pedido.payment_method_2 ? segundo : 0)) * 100) / 100,
            },
          ];
          if (pedido.payment_method_2 && segundo > 0) {
            lista.push({ forma: pedido.payment_method_2 as ParteBanco["method"], valor: segundo });
          }
          return lista;
        })();

    return {
      id: pedido.id,
      label: pedido.label,
      data: pedido.closed_at ?? pedido.opened_at,
      itens: (itens ?? []).map((i) => ({
        nome: i.product_name,
        qtd: Number(i.quantity ?? 0),
        unitario: Number(i.unit_price ?? 0),
        subtotal: Number(i.subtotal ?? 0),
      })),
      bruto: Math.round((total + desconto) * 100) / 100,
      desconto,
      total,
      pagamentos,
      recebido: null,
      troco: null,
    };
  });

/** Vendas fechadas de um período, para reimprimir o recibo depois. */
export const listarVendas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ de: z.string(), ate: z.string(), limite: z.number().int().min(1).max(200).default(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: linhas, error } = await context.supabase
      .from("orders")
      .select("id, label, total, closed_at, payment_method")
      .eq("status", "paid")
      .gte("closed_at", data.de)
      .lt("closed_at", data.ate)
      .order("closed_at", { ascending: false })
      .limit(data.limite);
    if (error) throw new Error(error.message);
    return (linhas ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      total: Number(o.total ?? 0),
      closed_at: o.closed_at,
      payment_method: o.payment_method,
    }));
  });


/** Cancela (descarta) uma comanda em aberto. */
export const cancelarComanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({ status: "cancelled", closed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Soma itens numa comanda já aberta, sem reescrever o que já estava lá.
 *  Dois atendentes podem lançar na mesma conta sem apagar o do outro. */
export const adicionarItens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => itensSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: perfil } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (!perfil) throw new Error("Perfil da loja não encontrado.");

    /* Lote já lançado por esta mesma operação: não soma duas vezes. */
    if (data.client_op_id) {
      const { data: repetido } = await supabase
        .from("order_items")
        .select("id")
        .eq("client_op_id", `${data.client_op_id}#0`)
        .maybeSingle();
      if (repetido) {
        const { data: atual } = await supabase
          .from("orders")
          .select("total")
          .eq("id", data.order_id)
          .maybeSingle();
        return { id: data.order_id, total: Number(atual?.total ?? 0) };
      }
    }

    const { data: pedido, error: erroPedido } = await supabase
      .from("orders")
      .select("id, status, discount")
      .eq("id", data.order_id)
      .maybeSingle();
    if (erroPedido) throw new Error(erroPedido.message);
    if (!pedido) throw new Error("Essa conta não existe mais.");
    if (pedido.status !== "open") throw new Error("Essa conta já foi fechada.");

    const { error: erroItens } = await supabase.from("order_items").insert(
      data.items.map((i, k) => ({
        tenant_id: perfil.tenant_id,
        order_id: data.order_id,
        product_id: i.product_id ?? null,
        product_name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: i.unit_price * i.quantity,
        client_op_id: data.client_op_id ? `${data.client_op_id}#${k}` : null,
      })),

    );
    if (erroItens) throw new Error(erroItens.message);

    /* Total recalculado a partir do banco: fonte única de verdade. */
    const { data: todos, error: erroLer } = await supabase
      .from("order_items")
      .select("subtotal")
      .eq("order_id", data.order_id);
    if (erroLer) throw new Error(erroLer.message);
    const bruto = (todos ?? []).reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
    const total = Math.round((bruto - Number(pedido.discount ?? 0)) * 100) / 100;

    const { error } = await supabase.from("orders").update({ total }).eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { id: data.order_id, total };
  });
