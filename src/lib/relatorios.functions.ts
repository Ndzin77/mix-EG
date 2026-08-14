import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { exigirAssinatura } from "@/lib/assinatura-guard";
import { somarFormas, type FormaBanco } from "@/lib/pagamentos";
import { arred, diaIso, eixo, faixas, naLoja, rotuloForma, type Faixa } from "@/lib/relatorios";

/** Intervalo livre de dias + fuso do navegador da loja, para o dia começar
 *  à meia-noite dela e não à meia-noite do servidor. */
const entrada = z.object({
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  offsetMin: z.number().int().min(-900).max(900).default(0),
});

/** Resumo agregado de um período: totais, série do gráfico, ranking de
 *  produtos, formas de pagamento e saídas por categoria. RLS já limita
 *  tudo à empresa do usuário logado. */
export const resumoPeriodo = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => entrada.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const intervalo = { de: data.de, ate: data.ate };
    const { atual, anterior } = faixas(intervalo, data.offsetMin);

    const pedidosDe = (f: Faixa) =>
      supabase
        .from("orders")
        .select("id, total, discount, payment_method, payment_method_2, amount_2, closed_at")
        .eq("status", "paid")
        .gte("closed_at", f.inicio.toISOString())
        .lt("closed_at", f.fim.toISOString());

    const saidasDe = (f: Faixa) =>
      supabase
        .from("expenses")
        .select("amount, category, occurred_at")
        .gte("occurred_at", f.inicio.toISOString())
        .lt("occurred_at", f.fim.toISOString());

    const [pagos, saidas, pagosAnt, saidasAnt] = await Promise.all([
      pedidosDe(atual),
      saidasDe(atual),
      pedidosDe(anterior),
      saidasDe(anterior),
    ]);
    for (const r of [pagos, saidas, pagosAnt, saidasAnt]) {
      if (r.error) throw new Error(r.error.message);
    }

    const linhasPagas = pagos.data ?? [];
    const ids = linhasPagas.map((o) => o.id);
    let itens: { nome: string; qtd: number; valor: number }[] = [];
    if (ids.length) {
      const { data: dadosItens, error } = await supabase
        .from("order_items")
        .select("product_name, quantity, subtotal")
        .in("order_id", ids);
      if (error) throw new Error(error.message);
      itens = (dadosItens ?? []).map((i) => ({
        nome: i.product_name,
        qtd: Number(i.quantity ?? 0),
        valor: Number(i.subtotal ?? 0),
      }));
    }

    const { rotulos, indice } = eixo(intervalo, data.offsetMin);
    const serie = rotulos.map((rotulo) => ({ rotulo, entrada: 0, saida: 0 }));

    let partes: { order_id: string; method: string; amount: number }[] = [];
    if (ids.length) {
      const { data: pags, error } = await supabase
        .from("order_payments")
        .select("order_id, method, amount")
        .in("order_id", ids);
      if (error) throw new Error(error.message);
      partes = (pags ?? []).map((p) => ({
        order_id: p.order_id,
        method: p.method,
        amount: Number(p.amount ?? 0),
      }));
    }
    const formas = somarFormas(linhasPagas as never, partes as never);

    let entradas = 0;
    let descontos = 0;
    for (const o of linhasPagas) {
      const total = Number(o.total ?? 0);
      entradas += total;
      descontos += Number(o.discount ?? 0);
      if (o.closed_at) {
        const alvo = serie[indice(new Date(o.closed_at))];
        if (alvo) alvo.entrada += total;
      }
    }

    const porCategoria: Record<string, number> = {};
    let totalSaidas = 0;
    for (const s of saidas.data ?? []) {
      const v = Number(s.amount ?? 0);
      totalSaidas += v;
      const cat = s.category ?? "Outros";
      porCategoria[cat] = (porCategoria[cat] ?? 0) + v;
      if (s.occurred_at) {
        const alvo = serie[indice(new Date(s.occurred_at))];
        if (alvo) alvo.saida += v;
      }
    }

    const mapa = new Map<string, { nome: string; qtd: number; valor: number }>();
    for (const i of itens) {
      const acc = mapa.get(i.nome) ?? { nome: i.nome, qtd: 0, valor: 0 };
      acc.qtd += i.qtd;
      acc.valor += i.valor;
      mapa.set(i.nome, acc);
    }
    const top = [...mapa.values()]
      .map((p) => ({ nome: p.nome, qtd: arred(p.qtd), valor: arred(p.valor) }))
      .sort((a, b) => b.qtd - a.qtd || b.valor - a.valor)
      .slice(0, 8);

    const entradasAnt = (pagosAnt.data ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const saidasAntTotal = (saidasAnt.data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const vendas = linhasPagas.length;

    return {
      de: atual.inicio.toISOString(),
      ate: atual.fim.toISOString(),
      entradas: arred(entradas),
      saidas: arred(totalSaidas),
      resultado: arred(entradas - totalSaidas),
      descontos: arred(descontos),
      vendas,
      ticket: vendas ? arred(entradas / vendas) : 0,
      itensVendidos: arred(itens.reduce((s, i) => s + i.qtd, 0)),
      serie: serie.map((s) => ({
        rotulo: s.rotulo,
        entrada: arred(s.entrada),
        saida: arred(s.saida),
      })),
      formas: {
        cash: arred(formas.cash ?? 0),
        pix: arred(formas.pix ?? 0),
        debit: arred(formas.debit ?? 0),
        credit: arred(formas.credit ?? 0),
        other: arred(formas.other ?? 0),
      },
      top,
      saidasPorCategoria: Object.fromEntries(
        Object.entries(porCategoria)
          .map(([k, v]) => [k, arred(v)] as const)
          .sort((a, b) => b[1] - a[1]),
      ) as Record<string, number>,
      anterior: {
        entradas: arred(entradasAnt),
        saidas: arred(saidasAntTotal),
        resultado: arred(entradasAnt - saidasAntTotal),
      },
    };
  });

export type ResumoPeriodo = Awaited<ReturnType<typeof resumoPeriodo>>;

/** Uma linha por venda fechada — é isso que o contador precisa ver, sem
 *  gráfico, sem ranking, sem bloco extra na planilha. */
export const vendasDoPeriodo = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => entrada.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { atual } = faixas({ de: data.de, ate: data.ate }, data.offsetMin);

    const { data: pedidos, error } = await supabase
      .from("orders")
      .select("id, label, total, discount, payment_method, payment_method_2, amount_2, closed_at")
      .eq("status", "paid")
      .gte("closed_at", atual.inicio.toISOString())
      .lt("closed_at", atual.fim.toISOString())
      .order("closed_at", { ascending: true });
    if (error) throw new Error(error.message);

    const linhas = pedidos ?? [];
    const ids = linhas.map((o) => o.id);

    const [itensRes, partesRes] = await Promise.all([
      ids.length
        ? supabase
            .from("order_items")
            .select("order_id, product_name, quantity")
            .in("order_id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? supabase.from("order_payments").select("order_id, method, amount").in("order_id", ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (itensRes.error) throw new Error(itensRes.error.message);
    if (partesRes.error) throw new Error(partesRes.error.message);

    const itensPorPedido = new Map<string, string[]>();
    for (const i of itensRes.data ?? []) {
      const lista = itensPorPedido.get(i.order_id) ?? [];
      lista.push(`${arred(Number(i.quantity ?? 0))}× ${i.product_name}`);
      itensPorPedido.set(i.order_id, lista);
    }

    const pagosPorPedido = new Map<string, string[]>();
    for (const p of partesRes.data ?? []) {
      const lista = pagosPorPedido.get(p.order_id) ?? [];
      lista.push(`${rotuloForma[p.method] ?? p.method} R$ ${arred(Number(p.amount ?? 0))}`);
      pagosPorPedido.set(p.order_id, lista);
    }

    return linhas.map((o) => {
      const detalhe = pagosPorPedido.get(o.id);
      const total = arred(Number(o.total ?? 0));
      const formas = detalhe?.length
        ? detalhe.join(" + ")
        : [
            rotuloForma[o.payment_method ?? "other"] ?? o.payment_method ?? "—",
            o.payment_method_2 && Number(o.amount_2 ?? 0) > 0
              ? `${rotuloForma[o.payment_method_2] ?? o.payment_method_2} R$ ${arred(Number(o.amount_2))}`
              : null,
          ]
            .filter(Boolean)
            .join(" + ");

      return {
        id: o.id,
        fechada: o.closed_at ?? "",
        conta: o.label ?? "Balcão",
        itens: (itensPorPedido.get(o.id) ?? []).join(", "),
        desconto: arred(Number(o.discount ?? 0)),
        total,
        formas,
      };
    });
  });

/** Fechamento dia a dia: uma linha por data com faturou / saiu / sobrou e, por
 *  baixo, o detalhe do que vendeu e do que saiu. É o formato que a dona lê em
 *  voz alta no fim do mês, sem coluna sobrando. */
export const fechamentoDiario = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => entrada.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { atual } = faixas({ de: data.de, ate: data.ate }, data.offsetMin);
    const off = data.offsetMin;
    const diaDe = (iso: string) => diaIso(naLoja(iso, off));

    const [pedidosRes, saidasRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total, payment_method, payment_method_2, amount_2, closed_at")
        .eq("status", "paid")
        .gte("closed_at", atual.inicio.toISOString())
        .lt("closed_at", atual.fim.toISOString())
        .order("closed_at", { ascending: true }),
      supabase
        .from("expenses")
        .select("description, category, amount, occurred_at")
        .gte("occurred_at", atual.inicio.toISOString())
        .lt("occurred_at", atual.fim.toISOString())
        .order("occurred_at", { ascending: true }),
    ]);
    if (pedidosRes.error) throw new Error(pedidosRes.error.message);
    if (saidasRes.error) throw new Error(saidasRes.error.message);

    const pedidos = pedidosRes.data ?? [];
    const ids = pedidos.map((o) => o.id);
    let itens: { order_id: string; product_name: string; quantity: number; subtotal: number }[] = [];
    if (ids.length) {
      const { data: linhas, error } = await supabase
        .from("order_items")
        .select("order_id, product_name, quantity, subtotal")
        .in("order_id", ids);
      if (error) throw new Error(error.message);
      itens = (linhas ?? []).map((i) => ({
        order_id: i.order_id,
        product_name: i.product_name,
        quantity: Number(i.quantity ?? 0),
        subtotal: Number(i.subtotal ?? 0),
      }));
    }

    /* O contador precisa saber quanto entrou em cada forma — por dia. */
    let partes: { order_id: string; method: FormaBanco; amount: number }[] = [];
    if (ids.length) {
      const { data: pagos, error } = await supabase
        .from("order_payments")
        .select("order_id, method, amount")
        .in("order_id", ids);
      if (error) throw new Error(error.message);
      partes = (pagos ?? []) as never;
    }

    type Dia = {
      dia: string;
      faturou: number;
      saiu: number;
      vendas: number;
      produtos: Map<string, { nome: string; qtd: number; valor: number }>;
      saidas: { descricao: string; categoria: string; valor: number }[];
      pedidos: string[];
    };
    const dias = new Map<string, Dia>();
    const pegar = (d: string) => {
      let alvo = dias.get(d);
      if (!alvo) {
        alvo = { dia: d, faturou: 0, saiu: 0, vendas: 0, produtos: new Map(), saidas: [], pedidos: [] };
        dias.set(d, alvo);
      }
      return alvo;
    };

    const diaDoPedido = new Map<string, string>();
    for (const o of pedidos) {
      if (!o.closed_at) continue;
      const d = diaDe(o.closed_at);
      diaDoPedido.set(o.id, d);
      const alvo = pegar(d);
      alvo.faturou += Number(o.total ?? 0);
      alvo.vendas += 1;
      alvo.pedidos.push(o.id);
    }

    for (const i of itens) {
      const d = diaDoPedido.get(i.order_id);
      if (!d) continue;
      const alvo = pegar(d);
      const acc = alvo.produtos.get(i.product_name) ?? { nome: i.product_name, qtd: 0, valor: 0 };
      acc.qtd += i.quantity;
      acc.valor += i.subtotal;
      alvo.produtos.set(i.product_name, acc);
    }

    for (const s of saidasRes.data ?? []) {
      if (!s.occurred_at) continue;
      const alvo = pegar(diaDe(s.occurred_at));
      const v = Number(s.amount ?? 0);
      alvo.saiu += v;
      alvo.saidas.push({
        descricao: s.description ?? "Saída",
        categoria: s.category ?? "Outros",
        valor: arred(v),
      });
    }

    return [...dias.values()]
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((d) => ({
        dia: d.dia,
        faturou: arred(d.faturou),
        saiu: arred(d.saiu),
        sobrou: arred(d.faturou - d.saiu),
        vendas: d.vendas,
        produtos: [...d.produtos.values()]
          .map((p) => ({ nome: p.nome, qtd: arred(p.qtd), valor: arred(p.valor) }))
          .sort((a, b) => b.valor - a.valor),
        saidas: d.saidas,
        formas: (() => {
          const doDia = new Set(d.pedidos);
          const f = somarFormas(
            pedidos.filter((o) => doDia.has(o.id)) as never,
            partes.filter((p) => doDia.has(p.order_id)) as never,
          );
          return {
            cash: arred(f.cash ?? 0),
            pix: arred(f.pix ?? 0),
            debit: arred(f.debit ?? 0),
            credit: arred(f.credit ?? 0),
            other: arred(f.other ?? 0),
          };
        })(),
      }));
  });

export type FechamentoDia = Awaited<ReturnType<typeof fechamentoDiario>>[number];

/** Movimento item a item do período — a planilha que vai para o contador.
 *  Cada linha se explica sozinha: venda traz conta, hora, unitário e forma de
 *  pagamento; saída traz categoria. Nada de coluna misturada. */
export const movimentoDetalhado = createServerFn({ method: "GET" })
  .middleware([exigirAssinatura])
  .inputValidator((input: unknown) => entrada.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { atual } = faixas({ de: data.de, ate: data.ate }, data.offsetMin);

    const [pedidosRes, saidasRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, label, total, discount, payment_method, payment_method_2, amount_2, closed_at")
        .eq("status", "paid")
        .gte("closed_at", atual.inicio.toISOString())
        .lt("closed_at", atual.fim.toISOString())
        .order("closed_at", { ascending: true }),
      supabase
        .from("expenses")
        .select("description, category, amount, occurred_at")
        .gte("occurred_at", atual.inicio.toISOString())
        .lt("occurred_at", atual.fim.toISOString())
        .order("occurred_at", { ascending: true }),
    ]);
    if (pedidosRes.error) throw new Error(pedidosRes.error.message);
    if (saidasRes.error) throw new Error(saidasRes.error.message);

    const pedidos = pedidosRes.data ?? [];
    const ids = pedidos.map((o) => o.id);

    const [itensRes, partesRes] = await Promise.all([
      ids.length
        ? supabase
            .from("order_items")
            .select("order_id, product_name, quantity, unit_price, subtotal")
            .in("order_id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? supabase.from("order_payments").select("order_id, method, amount").in("order_id", ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (itensRes.error) throw new Error(itensRes.error.message);
    if (partesRes.error) throw new Error(partesRes.error.message);

    const pagosPorPedido = new Map<string, string[]>();
    for (const p of partesRes.data ?? []) {
      const lista = pagosPorPedido.get(p.order_id) ?? [];
      lista.push(rotuloForma[p.method] ?? p.method);
      pagosPorPedido.set(p.order_id, lista);
    }

    const info = new Map<
      string,
      { conta: string; quando: string; desconto: number; pagamento: string }
    >();
    for (const o of pedidos) {
      const detalhe = pagosPorPedido.get(o.id);
      const pagamento = detalhe?.length
        ? [...new Set(detalhe)].join(" + ")
        : [
            rotuloForma[o.payment_method ?? "other"] ?? o.payment_method ?? "",
            o.payment_method_2 && Number(o.amount_2 ?? 0) > 0
              ? (rotuloForma[o.payment_method_2] ?? o.payment_method_2)
              : null,
          ]
            .filter(Boolean)
            .join(" + ");
      info.set(o.id, {
        conta: o.label ?? "Balcão",
        quando: o.closed_at ?? "",
        desconto: arred(Number(o.discount ?? 0)),
        pagamento,
      });
    }

    /* O desconto é do pedido inteiro: sai só na primeira linha dele, para não
       somar cinco vezes o mesmo abatimento na planilha. */
    const jaContou = new Set<string>();

    const vendas = (itensRes.data ?? []).map((i) => {
      const dados = info.get(i.order_id);
      const primeiro = dados && !jaContou.has(i.order_id);
      if (primeiro) jaContou.add(i.order_id);
      const qtd = arred(Number(i.quantity ?? 0));
      const totalItem = arred(Number(i.subtotal ?? 0));
      return {
        tipo: "Venda" as const,
        quando: dados?.quando ?? "",
        conta: dados?.conta ?? "",
        descricao: i.product_name,
        categoria: "",
        qtd,
        unitario: arred(Number(i.unit_price ?? (qtd ? totalItem / qtd : 0))),
        total: totalItem,
        desconto: primeiro ? (dados?.desconto ?? 0) : 0,
        pagamento: dados?.pagamento ?? "",
      };
    });

    const saidas = (saidasRes.data ?? []).map((s) => ({
      tipo: "Saída" as const,
      quando: s.occurred_at ?? "",
      conta: "",
      descricao: s.description ?? "Saída",
      categoria: s.category ?? "Outros",
      qtd: null,
      unitario: null,
      total: arred(Number(s.amount ?? 0)),
      desconto: 0,
      pagamento: "",
    }));

    return [...vendas, ...saidas].sort((a, b) => a.quando.localeCompare(b.quando));
  });

export type LinhaMovimento = Awaited<ReturnType<typeof movimentoDetalhado>>[number];
