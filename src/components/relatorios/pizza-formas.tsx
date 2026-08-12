import { useState } from "react";
import { brl } from "@/lib/config";
import { rotuloForma } from "@/lib/relatorios";
import { cn } from "@/lib/utils";

/** Cores fixas por forma de pagamento: a mesma fatia sempre com a mesma cor. */
const cor: Record<string, string> = {
  cash: "var(--success)",
  pix: "var(--primary)",
  debit: "var(--warning)",
  credit: "var(--danger)",
  other: "var(--muted-foreground)",
};

const RAIO = 60;
const PERIMETRO = 2 * Math.PI * RAIO;

/**
 * Rosca em SVG puro: uma fatia por forma de pagamento, total no centro e
 * legenda ao lado. Sem biblioteca de gráfico — só stroke-dasharray.
 */
export function PizzaFormas({ formas }: { formas: [string, number][] }) {
  const [foco, setFoco] = useState<string | null>(null);
  const total = formas.reduce((s, [, v]) => s + v, 0);
  if (!total) return null;

  let acumulado = 0;
  const fatias = formas.map(([k, v]) => {
    const fracao = v / total;
    const fatia = { k, v, fracao, offset: acumulado };
    acumulado += fracao;
    return fatia;
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0 -rotate-90" role="img" aria-label="Formas de pagamento">
        {fatias.map((f) => (
          <circle
            key={f.k}
            cx="80"
            cy="80"
            r={RAIO}
            fill="none"
            stroke={cor[f.k] ?? cor.other}
            strokeWidth={foco === f.k ? 30 : 22}
            strokeDasharray={`${f.fracao * PERIMETRO} ${PERIMETRO}`}
            strokeDashoffset={-f.offset * PERIMETRO}
            className="transition-all duration-200"
            onMouseEnter={() => setFoco(f.k)}
            onMouseLeave={() => setFoco(null)}
          />
        ))}
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 fill-foreground text-[1.05rem] font-black tabular-nums"
          style={{ transformOrigin: "80px 80px" }}
        >
          R$ {brl(foco ? (fatias.find((f) => f.k === foco)?.v ?? total) : total)}
        </text>
      </svg>

      <ul className="min-w-40 flex-1 space-y-2">
        {fatias.map((f) => (
          <li
            key={f.k}
            onMouseEnter={() => setFoco(f.k)}
            onMouseLeave={() => setFoco(null)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
              foco === f.k && "bg-accent/50",
            )}
          >
            <span
              className="size-3.5 shrink-0 rounded-full"
              style={{ background: cor[f.k] ?? cor.other }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {rotuloForma[f.k] ?? f.k}
            </span>
            <span className="money shrink-0 tabular-nums">R$ {brl(f.v)}</span>
            <span className="w-10 shrink-0 text-right text-xs font-bold text-muted-foreground tabular-nums">
              {Math.round(f.fracao * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
