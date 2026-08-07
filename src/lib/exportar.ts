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

const diaBr = (dia: string) => {
  const [y, m, d] = dia.split("-");
  return `${d}/${m}/${y}`;
};

/** Planilha resumida: uma linha por dia e o total. Nada de título solto,
 *  linha em branco ou texto decorativo — só tabela. */
export function linhasResumo(dias: FechamentoDia[]): (string | number)[][] {
  const linhas: (string | number)[][] = [["Dia", "Vendas", "Faturou", "Saiu", "Sobrou"]];
  for (const d of dias) linhas.push([diaBr(d.dia), d.vendas, d.faturou, d.saiu, d.sobrou]);
  linhas.push([
    "TOTAL",
    dias.reduce((s, d) => s + d.vendas, 0),
    dias.reduce((s, d) => s + d.faturou, 0),
    dias.reduce((s, d) => s + d.saiu, 0),
    dias.reduce((s, d) => s + d.sobrou, 0),
  ]);
  return linhas;
}

/** Planilha detalhada: uma linha por item vendido e por saída, com cada coluna
 *  preenchida com o que faz sentido para aquela linha. É o que vai ao contador. */
export function linhasDetalhe(mov: LinhaMovimento[]): (string | number)[][] {
  const hora = (iso: string) =>
    iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");

  const linhas: (string | number)[][] = [
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
  ];

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
  return linhas;
}

