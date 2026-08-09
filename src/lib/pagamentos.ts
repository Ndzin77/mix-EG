/** Uma venda pode ser paga em quantas formas o cliente quiser.
 *  Cada parte vira uma linha em `order_payments`; as colunas antigas de
 *  `orders` continuam preenchidas para não quebrar nada que já lê de lá. */
export type FormaBanco = "cash" | "debit" | "credit" | "pix" | "other";

export type ParteBanco = { order_id: string; method: FormaBanco; amount: number };

export type PedidoBase = {
  id: string;
  total: number | string | null;
  payment_method: string | null;
  payment_method_2: string | null;
  amount_2: number | string | null;
};

export const formaVazia = (): Record<string, number> => ({
  cash: 0,
  pix: 0,
  debit: 0,
  credit: 0,
  other: 0,
});

/** Soma por forma de pagamento. Onde existir detalhamento em
 *  `order_payments` ele manda; senão cai nas colunas do pedido. */
export function somarFormas(pedidos: PedidoBase[], partes: ParteBanco[]): Record<string, number> {
  const formas = formaVazia();
  const porPedido = new Map<string, ParteBanco[]>();
  for (const p of partes) {
    const lista = porPedido.get(p.order_id) ?? [];
    lista.push(p);
    porPedido.set(p.order_id, lista);
  }

  for (const o of pedidos) {
    const total = Number(o.total ?? 0);
    const detalhe = porPedido.get(o.id);
    if (detalhe?.length) {
      for (const d of detalhe) {
        const forma = d.method ?? "other";
        formas[forma] = (formas[forma] ?? 0) + Number(d.amount ?? 0);
      }
      continue;
    }
    const segundo = Math.min(Number(o.amount_2 ?? 0), total);
    if (segundo > 0 && o.payment_method_2) {
      formas[o.payment_method_2] = (formas[o.payment_method_2] ?? 0) + segundo;
    }
    const principal = total - (o.payment_method_2 ? segundo : 0);
    const forma = o.payment_method ?? "other";
    formas[forma] = (formas[forma] ?? 0) + principal;
  }

  return formas;
}
