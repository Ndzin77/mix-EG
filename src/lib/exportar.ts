import type { FechamentoDia, LinhaMovimento } from "@/lib/relatorios.functions";

/** Exportação simples: CSV que abre no Excel (com BOM e ponto-e-vírgula,
 *  do jeito que o Excel em português espera). Número sai como número —
 *  inteiro sem casas, valor com duas — para o Excel somar sozinho. */
export function baixarCsv(nome: string, linhas: (string | number)[][]) {
  const corpo = linhas
    .map((l) =>
      l
        .map((c) => {
          if (typeof c === "number") {
            return Number.isInteger(c) ? String(c) : c.toFixed(2).replace(".", ",");
          }
          return `"${String(c ?? "").replace(/"/g, '""')}"`;
        })
        .join(";"),
    )
    .join("\r\n");

  const blob = new Blob([`\uFEFF${corpo}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome.endsWith(".csv") ? nome : `${nome}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const arred = (n: number) => Math.round(n * 100) / 100;

const diaBr = (dia: string) => {
  const [y, m, d] = dia.split("-");
  return `${d}/${m}/${y}`;
};

/** Nome que o contador entende, na ordem em que ele confere. */
const FORMAS = [
  ["cash", "Dinheiro"],
  ["pix", "Pix"],
  ["debit", "Débito"],
  ["credit", "Crédito"],
  ["other", "Outros"],
] as const;

/** Planilha resumida: uma linha por dia, com o quanto entrou em cada forma de
 *  pagamento, e o total. Nada de título solto ou texto decorativo. */
export function linhasResumo(dias: FechamentoDia[], semDinheiro = false): (string | number)[][] {
  const formas = semDinheiro ? FORMAS.filter(([c]) => c !== "cash") : FORMAS;
  /* Sem dinheiro: fica só o que passou por PIX/cartão, dos dois lados. */
  const faturouDe = (d: FechamentoDia) =>
    semDinheiro ? arred(d.faturou - (d.formas?.cash ?? 0)) : d.faturou;
  const saiuDe = (d: FechamentoDia) =>
    semDinheiro ? arred(d.saiu - (d.saiuDinheiro ?? 0)) : d.saiu;

  const linhas: (string | number)[][] = [];
  if (semDinheiro) linhas.push(["Recorte: somente PIX e cartão (dinheiro fora)"], []);
  linhas.push(["Dia", "Vendas", "Faturou", ...formas.map(([, n]) => n), "Saiu", "Sobrou"]);

  for (const d of dias) {
    linhas.push([
      diaBr(d.dia),
      d.vendas,
      faturouDe(d),
      ...formas.map(([chave]) => d.formas?.[chave] ?? 0),
      saiuDe(d),
      arred(faturouDe(d) - saiuDe(d)),
    ]);
  }
  const somaFaturou = arred(dias.reduce((s, d) => s + faturouDe(d), 0));
  const somaSaiu = arred(dias.reduce((s, d) => s + saiuDe(d), 0));
  linhas.push([
    "TOTAL",
    dias.reduce((s, d) => s + d.vendas, 0),
    somaFaturou,
    ...formas.map(([chave]) => arred(dias.reduce((s, d) => s + (d.formas?.[chave] ?? 0), 0))),
    somaSaiu,
    arred(somaFaturou - somaSaiu),
  ]);
  return linhas;
}


/** Planilha detalhada: uma linha por item vendido e por saída, com cada coluna
 *  preenchida com o que faz sentido para aquela linha. É o que vai ao contador. */
export function linhasDetalhe(
  todas: LinhaMovimento[],
  dias: FechamentoDia[] = [],
  semDinheiro = false,
): (string | number)[][] {
  const mov = semDinheiro ? todas.filter((m) => !m.soDinheiro) : todas;
  const formasVisiveis = semDinheiro ? FORMAS.filter(([c]) => c !== "cash") : FORMAS;
  const hora = (iso: string) =>
    iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");

  const linhas: (string | number)[][] = [];
  if (semDinheiro) linhas.push(["Recorte: somente PIX e cartão (dinheiro fora)"], []);
  linhas.push(
    [
      "Data",
      "Hora",
      "Tipo",
      "Conta",
      "Produto/Descrição",
      "Categoria",
      "Qtd",
      "Valor unitário",
      "Valor total",
      "Desconto",
      "Pagamento",
    ],
  );

  for (const m of mov) {
    linhas.push([
      dataBr(m.quando),
      hora(m.quando),
      m.tipo,
      m.conta,
      m.descricao,
      m.categoria,
      m.qtd ?? "",
      m.unitario ?? "",
      m.total,
      m.desconto || "",
      m.pagamento,
    ]);
  }

  const entradas = mov.filter((m) => m.tipo === "Venda").reduce((s, m) => s + m.total, 0);
  const saidas = mov.filter((m) => m.tipo === "Saída").reduce((s, m) => s + m.total, 0);
  const desconto = mov.reduce((s, m) => s + m.desconto, 0);

  linhas.push([]);
  linhas.push(["TOTAL", "", "Vendas", "", "", "", "", "", entradas, desconto, ""]);
  linhas.push(["TOTAL", "", "Saídas", "", "", "", "", "", saidas, "", ""]);
  linhas.push(["TOTAL", "", "Sobrou", "", "", "", "", "", entradas - saidas, "", ""]);

  /* O contador pede sempre a mesma coisa: quanto entrou em cada forma. */
  if (dias.length) {
    linhas.push([]);
    linhas.push(["RECEBIDO POR FORMA DE PAGAMENTO"]);
    linhas.push(["Forma", "", "", "", "", "", "", "", "Valor", "", ""]);
    for (const [chave, nome] of formasVisiveis) {
      const valor = dias.reduce((t, d) => t + (d.formas?.[chave] ?? 0), 0);
      if (valor > 0) linhas.push([nome, "", "", "", "", "", "", "", valor, "", ""]);
    }
  }
  return linhas;
}

