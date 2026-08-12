import type { FormaBanco } from "@/lib/pagamentos";

export type ItemRecibo = {
  nome: string;
  qtd: number;
  unitario: number;
  subtotal: number;
};

export type ParteRecibo = { forma: FormaBanco; valor: number };

/** Tudo que o papel precisa mostrar, já pronto — a tela só desenha. */
export type ReciboDados = {
  id: string;
  label: string;
  /** quem atendeu, quando a loja quiser imprimir isso */
  operador?: string;
  /** ISO da hora do fechamento */
  data: string;
  itens: ItemRecibo[];
  bruto: number;
  desconto: number;
  total: number;
  pagamentos: ParteRecibo[];
  recebido: number | null;
  troco: number | null;
};

export type FormatoRecibo = "bobina" | "a4";

/** Nº curto para o cliente conferir sem ler um UUID inteiro. */
export const numeroRecibo = (id: string) => id.replace(/-/g, "").slice(-6).toUpperCase();

export function dataHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
