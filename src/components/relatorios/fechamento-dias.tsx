import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { brl } from "@/lib/config";
import { diaIso } from "@/lib/relatorios";
import type { FechamentoDia } from "@/lib/relatorios.functions";
import { cn } from "@/lib/utils";

const diaBr = (dia: string) => {
  const [y, m, d] = dia.split("-");
  return `${d}/${m}/${y}`;
};

const COLS = "grid-cols-[minmax(5.5rem,auto)_repeat(3,minmax(0,1fr))_1.5rem]";

/** Fechamento dia a dia: a linha de cima responde "quanto sobrou", e cada dia
 *  abre sozinho o detalhe do que vendeu e do que saiu. */
export function FechamentoDias({
  dias,
  carregando,
  titulo,
  onExportar,
  baixando,
}: {
  dias: FechamentoDia[];
  carregando: boolean;
  titulo: string;
  onExportar: (modo: "resumo" | "detalhe") => void;
  baixando: boolean;
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState(false);
  const caixaMenu = useRef<HTMLDivElement>(null);
  const hoje = diaIso(new Date());
  const todosAbertos = dias.length > 0 && abertos.size === dias.length;

  useEffect(() => {
    if (!menu) return;
    const fora = (e: MouseEvent) => {
      if (!caixaMenu.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [menu]);

  const alternar = (dia: string) =>
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(dia)) n.delete(dia);
      else n.add(dia);
      return n;
    });

  const total = dias.reduce(
    (a, d) => ({
      faturou: a.faturou + d.faturou,
      saiu: a.saiu + d.saiu,
      sobrou: a.sobrou + d.sobrou,
    }),
    { faturou: 0, saiu: 0, sobrou: 0 },
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <h2 className="font-display text-xl tracking-wide">Fechamento · {titulo}</h2>

        <label className="no-print ml-auto flex cursor-pointer items-center gap-2 text-xs font-bold text-muted-foreground">
          <input
            type="checkbox"
            checked={todosAbertos}
            onChange={(e) =>
              setAbertos(e.target.checked ? new Set(dias.map((d) => d.dia)) : new Set())
            }
            className="size-4 accent-[var(--color-primary)]"
          />
          Ver detalhe por produto
        </label>

        <div ref={caixaMenu} className="no-print relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            disabled={baixando}
            aria-expanded={menu}
            className="press flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold transition-colors hover:border-primary disabled:opacity-60"
          >
            {baixando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Planilha
            <ChevronDown className="size-3.5" />
          </button>
          {menu ? (
            <div className="modal-in absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border-2 border-border bg-card shadow-2xl">
              {(
                [
                  ["resumo", "Resumida", "Um dia por linha"],
                  ["detalhe", "Detalhada", "Um item por linha"],
                ] as const
              ).map(([modo, nome, ajuda]) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onExportar(modo);
                  }}
                  className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="block text-sm font-bold">{nome}</span>
                  <span className="block text-xs text-muted-foreground">{ajuda}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {carregando ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : dias.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Nenhum movimento nesse período.
        </p>
      ) : (
        <>
          <div
            className={cn(
              "grid gap-3 border-b border-border bg-secondary/40 px-5 py-1.5",
              COLS,
            )}
          >
            <span className="eyebrow text-muted-foreground">Dia</span>
            <span className="eyebrow text-right text-muted-foreground">Faturou</span>
            <span className="eyebrow text-right text-muted-foreground">Saiu</span>
            <span className="eyebrow text-right text-muted-foreground">Sobrou</span>
            <span />
          </div>

          <ul className="max-h-[32rem] overflow-y-auto overscroll-contain">
            {dias.map((d, i) => {
              const aberto = abertos.has(d.dia);
              return (
                <li
                  key={d.dia}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    i % 2 ? "bg-secondary/15" : "",
                    d.dia === hoje && "border-l-4 border-l-primary",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => alternar(d.dia)}
                    aria-expanded={aberto}
                    className={cn(
                      "grid w-full items-baseline gap-3 px-5 py-2.5 text-left transition-colors hover:bg-accent/40",
                      COLS,
                    )}
                  >
                    <span className="money text-sm">
                      {diaBr(d.dia)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {d.vendas}v
                      </span>
                    </span>
                    <span className="money text-right tabular-nums text-success">
                      {brl(d.faturou)}
                    </span>
                    <span className="money text-right tabular-nums text-danger">{brl(d.saiu)}</span>
                    <span
                      className={cn(
                        "money text-right font-bold tabular-nums",
                        d.sobrou >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {brl(d.sobrou)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 self-center text-muted-foreground transition-transform",
                        aberto && "rotate-180",
                      )}
                    />
                  </button>

                  {aberto ? (
                    <div className="grid gap-5 border-t border-dashed border-border bg-background/40 px-5 py-4 lg:grid-cols-2">
                      <Detalhe
                        titulo="Entrou"
                        vazio="Nenhuma venda nesse dia."
                        total={d.faturou}
                        cor="text-success"
                        linhas={d.produtos.map((p) => ({
                          chave: p.nome,
                          marca: `${p.qtd}×`,
                          nome: p.nome,
                          valor: p.valor,
                        }))}
                      />
                      <Detalhe
                        titulo="Saiu"
                        vazio="Nenhuma saída nesse dia."
                        total={d.saiu}
                        cor="text-danger"
                        linhas={d.saidas.map((s, k) => ({
                          chave: `${s.descricao}-${k}`,
                          marca: s.categoria,
                          nome: s.descricao,
                          valor: s.valor,
                        }))}
                      />
                    </div>

                  ) : null}
                </li>
              );
            })}
          </ul>

          <div
            className={cn(
              "grid items-baseline gap-3 border-t-2 border-border bg-secondary/40 px-5 py-2.5",
              COLS,
            )}
          >
            <span className="eyebrow">Total</span>
            <span className="money text-right tabular-nums text-success">{brl(total.faturou)}</span>
            <span className="money text-right tabular-nums text-danger">{brl(total.saiu)}</span>
            <span
              className={cn(
                "money text-right font-bold tabular-nums",
                total.sobrou >= 0 ? "text-success" : "text-danger",
              )}
            >
              {brl(total.sobrou)}
            </span>
            <span />
          </div>
        </>
      )}
    </section>
  );
}

/** Lista de leitura, não tabela: cada linha é uma frase — "3× Casquinha …
 *  R$ 21,00" — com a marca (quantidade ou categoria) num selo à esquerda. */
function Detalhe({
  titulo,
  vazio,
  linhas,
  total,
  cor,
}: {
  titulo: string;
  vazio: string;
  linhas: { chave: string; marca: string; nome: string; valor: number }[];
  total: number;
  cor: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className={cn("eyebrow", cor)}>{titulo}</p>
        <span className="text-[0.6875rem] font-bold text-muted-foreground">
          {linhas.length} {linhas.length === 1 ? "item" : "itens"}
        </span>
      </div>

      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1">
        {linhas.length === 0 ? (
          <li className="py-2 text-sm font-bold text-muted-foreground">{vazio}</li>
        ) : (
          linhas.map((l) => (
            <li
              key={l.chave}
              className="flex items-center gap-2 rounded-md px-1.5 py-1.5 odd:bg-foreground/4"
            >
              <span
                className={cn(
                  "money shrink-0 rounded-md px-1.5 py-0.5 text-[0.6875rem] tabular-nums",
                  cor,
                  "bg-current/10",
                )}
              >
                {l.marca}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{l.nome}</span>
              <span className="money shrink-0 text-sm tabular-nums">R$ {brl(l.valor)}</span>
            </li>
          ))
        )}
      </ul>

      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
        <span className="eyebrow text-muted-foreground">Total</span>
        <span className={cn("money text-lg tabular-nums", cor)}>R$ {brl(total)}</span>
      </div>
    </div>
  );

}
