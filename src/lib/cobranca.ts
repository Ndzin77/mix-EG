import type { FormaPagamento, PartePagamento } from "@/components/pdv/comum";

export const cent = (n: number) => Math.round(n * 100) / 100;

export type CobrancaEstado = {
  /** forma escolhida para a próxima parte */
  pagamento: FormaPagamento;
  /** desconto sempre em reais — é assim que vai para o banco */
  desconto: number;
  /** chave do bloco de desconto: fechada, o modal fica com uma linha só */
  descontoAtivo: boolean;
  descontoModo: "reais" | "percent";
  /** o número que a pessoa digitou, no modo escolhido */
  descontoEntrada: number | null;
  /** chave da conta dividida: quem paga numa forma só não vê nada disso */
  dividir: boolean;
  /** partes já encaixadas: dinheiro + PIX + cartão, quantas o cliente quiser */
  partes: PartePagamento[];
  /** valor digitado para a próxima parte (vazio = tudo que falta) */
  parcial: number | null;
  /** quanto entrou de verdade na forma escolhida */
  recebido: number | null;
  /** dinheiro: o cliente mandou ficar com o troco — vira acréscimo, não devolução */
  trocoDoado: boolean;
};

export type ResumoCobranca = {
  /** produtos menos o desconto digitado à mão */
  aPagar: number;
  /** desconto digitado no modal */
  descontoManual: number;
  /** soma das partes encaixadas (conta dividida) */
  pago: number;
  falta: number;
  /** o que a venda vale de verdade: é isso que vai para o caixa */
  cobrado: number;
  /** cobrado − aPagar: positivo é acréscimo, negativo é valor a menos */
  diferenca: number;
  /** só em dinheiro, e só quando o troco vai ser devolvido */
  troco: number;
  recebido: number | null;
  /** o botão verde só fecha a venda quando o que falta está encaixado */
  podeFechar: boolean;
  /** partes finais que vão para o banco */
  partes: PartePagamento[];
};

/**
 * Uma conta só para a tela e para o salvamento: o que o cliente entregou é o
 * que a venda vale. Valor a menos vira desconto, valor a mais vira acréscimo,
 * e troco existe apenas em dinheiro (a não ser que o cliente o deixe na loja).
 */
export function resumoCobranca(bruto: number, e: CobrancaEstado): ResumoCobranca {
  const descontoManual = Math.min(Math.max(0, e.desconto), bruto);
  const aPagar = Math.max(0, cent(bruto - descontoManual));
  const pago = cent(e.partes.reduce((s, p) => s + p.valor, 0));
  const falta = Math.max(0, cent(aPagar - pago));

  if (e.dividir) {
    /* Nada entra sozinho: o que vale é o que foi encaixado à mão. */
    const cobrado = pago;
    return {
      aPagar,
      descontoManual,
      pago,
      falta,
      cobrado,
      diferenca: cent(cobrado - aPagar),
      troco: 0,
      recebido: null,
      podeFechar: e.partes.length > 0 && falta < 0.005,
      partes: [...e.partes],
    };
  }

  const recebido = e.recebido;
  const informado = cent(recebido ?? aPagar);
  const dinheiro = e.pagamento === "cash";
  /* Dinheiro com troco a devolver: a venda continua valendo o preço da conta.
     Se o cliente disse "fica com o troco", o valor cheio entra como acréscimo. */
  const cobrado = dinheiro && !e.trocoDoado && informado > aPagar ? aPagar : Math.max(0, informado);
  const troco = dinheiro && !e.trocoDoado ? Math.max(0, cent(informado - aPagar)) : 0;

  return {
    aPagar,
    descontoManual,
    pago,
    falta,
    cobrado,
    diferenca: cent(cobrado - aPagar),
    troco,
    recebido: recebido,
    podeFechar: cobrado > 0,
    partes: [{ forma: e.pagamento, valor: cobrado }],
  };
}
