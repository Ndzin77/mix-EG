import { useEffect, useRef, useState } from "react";
import { Banknote, CreditCard, IceCream, QrCode, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/** Como o preço deste produto nasce. */
export type ModoPreco = "fixed" | "flavor" | "manual" | "weight";

/** Um sabor do mesmo produto, com preço próprio. Cada sabor pode cobrar do
 *  seu jeito: valor fixo, valor digitado na hora ou por peso. */
export type Sabor = {
  nome: string;
  preco: number;
  /** ausente = preço fixo */
  modo?: Exclude<ModoPreco, "flavor">;
  /** quanto custa o quilo deste sabor, quando é vendido por peso */
  precoKg?: number;
};

export type Produto = {
  id: string;
  cod: string;
  nome: string;
  detalhe: string;
  preco: number;
  tags: string[];
  /** foto do produto: `storage:<caminho>` ou link externo */
  foto?: string | null;
  /** ausente = preço fixo, como sempre foi */
  modo?: ModoPreco;
  /** quanto custa o quilo, quando é vendido por peso */
  precoKg?: number;
  /** sabores com preços diferentes dentro do mesmo produto */
  sabores?: Sabor[];
  /** sabores que não mudam o preço: só a escolha na hora da venda */
  opcoes?: string[];
  /** deixa o caixa marcar vários sabores (bolinhas) sem mudar o preço */
  opcoesMulti?: boolean;
};

/** Linha do carrinho. `uid` é a identidade da linha: duas pesagens do mesmo
 *  produto convivem sem se somar; o preço fixo continua agrupando pelo id. */
export type Linha = Produto & {
  uid: string;
  qtd: number;
  /** nome que vai para a conta/recibo: "Açaí — Premium", "Sorvete 350 g" */
  rotulo?: string;
  /** linha que já está gravada numa conta aberta: preserva o estado na bancada */
  itemId?: string;
};

export const modoDoProduto = (p: Produto): ModoPreco => p.modo ?? "fixed";

/** Selo curto para o cartão do produto quando o preço não é fixo. */
export function seloPreco(p: Produto): string | null {
  const m = modoDoProduto(p);
  if (m === "flavor") return "preço por sabor";
  if (m === "manual") return "preço na hora";
  if (m === "weight") return `R$ ${(p.precoKg ?? 0).toFixed(2).replace(".", ",")} / kg`;
  if (p.opcoes?.length) return `${p.opcoes.length} sabores`;
  return null;
}

export type ComandaCard = {
  id: string;
  label: string;
  /** minutos em aberto — mostrado no modal de detalhes */
  min?: number;
  /** quando a conta foi aberta (ISO) — usado no histórico */
  opened_at?: string | null;
  itens: {
    /** id da linha no banco: só existe no que já foi gravado (editável) */
    id?: string | null;
    product_id: string | null;
    product_name: string;
    unit_price: number;
    quantity: number;
    /** horários da linha no banco — usados no histórico da conta */
    created_at?: string | null;
    updated_at?: string | null;
  }[];
};



export const pagamentos = [
  { rotulo: "Dinheiro", valor: "cash", icone: Banknote, tecla: "1" },
  { rotulo: "PIX", valor: "pix", icone: QrCode, tecla: "2" },
  { rotulo: "Débito", valor: "debit", icone: Wallet, tecla: "3" },
  { rotulo: "Crédito", valor: "credit", icone: CreditCard, tecla: "4" },
] as const;

export type FormaPagamento = (typeof pagamentos)[number]["valor"];

/** Uma parte do pagamento: o cliente vai encaixando até zerar o que falta. */
export type PartePagamento = { forma: FormaPagamento; valor: number };

/** Cédulas reais do caixa: tocar na nota é mais rápido que digitar o valor. */
export const cedulas = [5, 10, 20, 50, 100];

/** Miniatura do produto: o olho reconhece a foto antes de ler o nome.
 *  Sem foto cadastrada, o ícone da casa entra no lugar. */
export function Foto({
  produto,
  url,
  className,
}: {
  produto: { nome: string; foto?: string | null };
  url?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary-soft to-secondary/60",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <IceCream className="size-1/2 text-primary/50" />
      )}
    </span>
  );
}

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Busca tipo caixa de pesquisa: enquanto digita, já mostra.
 *  Pontua para o resultado óbvio ficar sempre na primeira linha. */
export function buscar(catalogo: Produto[], termo: string): Produto[] {
  const q = norm(termo.trim());
  if (!q) return [];
  return catalogo
    .map((p) => {
      const nome = norm(p.nome);
      const tags = p.tags.map(norm);
      let score = -1;
      if (p.cod && norm(p.cod) === q) score = 100;
      else if (p.cod && norm(p.cod).startsWith(q)) score = 90;
      else if (nome.startsWith(q)) score = 80;
      else if (nome.includes(q)) score = 60;
      else if (tags.some((t) => t.startsWith(q))) score = 40;
      else if (tags.some((t) => t.includes(q))) score = 20;
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.p.nome.localeCompare(b.p.nome))
    .slice(0, 6)
    .map((r) => r.p);
}

/** Destaca o pedaço digitado: o olho acha o alvo sem ler a linha toda. */
export function Realce({ texto, termo }: { texto: string; termo: string }) {
  const q = norm(termo.trim());
  if (!q) return <>{texto}</>;
  const i = norm(texto).indexOf(q);
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark className="search-hit">{texto.slice(i, i + q.length)}</mark>
      {texto.slice(i + q.length)}
    </>
  );
}

/** O número não pula: ele corre. Movimento contínuo é o que o cérebro
 *  interpreta como "isso mudou por causa do que eu fiz". */
export function useContagem(alvo: number) {
  const [valor, setValor] = useState(alvo);
  const ref = useRef(alvo);
  useEffect(() => {
    const inicio = ref.current;
    if (inicio === alvo) return;
    const t0 = performance.now();
    const dur = 320;
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = inicio + (alvo - inicio) * e;
      ref.current = v;
      setValor(v);
      if (k < 1) raf = requestAnimationFrame(passo);
      else ref.current = alvo;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo]);
  return valor;
}
