import { Banknote, CreditCard, MoreHorizontal, QrCode } from "lucide-react";

/** De onde o dinheiro de uma saída saiu. Só "Dinheiro" mexe na gaveta física. */
export type Origem = "cash" | "pix" | "debit" | "credit" | "other";

export const origens: { chave: Origem; rotulo: string; icone: typeof Banknote }[] = [
  { chave: "cash", rotulo: "Dinheiro", icone: Banknote },
  { chave: "pix", rotulo: "PIX", icone: QrCode },
  { chave: "debit", rotulo: "Débito", icone: CreditCard },
  { chave: "credit", rotulo: "Crédito", icone: CreditCard },
  { chave: "other", rotulo: "Outro", icone: MoreHorizontal },
];

export const rotuloOrigem = (o: string) => origens.find((x) => x.chave === o)?.rotulo ?? "Dinheiro";
