import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { brl } from "@/lib/config";

/**
 * Gráficos dos relatórios. Cada pergunta tem a forma que o olho lê mais
 * rápido: fluxo no tempo vira área, gasto pontual vira barra, comparação
 * entre nomes vira barra deitada. Cores sempre dos tokens do sistema.
 */

const eixo = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  fontWeight: 700,
} as const;

/** Régua curta: "R$ 1,2 mil" cabe onde "R$ 1.200,00" não cabia. */
export function curto(v: number) {
  const n = Math.abs(v);
  if (n >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (n >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function Vazio({ texto = "Sem movimento neste período" }: { texto?: string }) {
  return (
    <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-border bg-secondary/30 text-center">
      <p className="px-6 text-sm font-bold text-muted-foreground">{texto}</p>
    </div>
  );
}

function Caixa({
  ativo,
  itens,
  rotulo,
}: {
  ativo?: boolean;
  itens?: { name?: string; value?: number | string; color?: string }[];
  rotulo?: string;
}) {
  if (!ativo || !itens?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[0.6875rem] font-black uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      {itens.map((i) => (
        <p key={i.name} className="money text-sm tabular-nums" style={{ color: i.color }}>
          {i.name}: R$ {brl(Number(i.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

/**
 * Entrada × saída no período. Entrada é fluxo (área contínua); saída é
 * evento pontual (barra) — a diferença de forma já conta a história antes
 * de qualquer número ser lido.
 */
export function AreaEntradaSaida({
  serie,
}: {
  serie: { rotulo: string; entrada: number; saida: number }[];
}) {
  const teto = Math.max(...serie.map((s) => Math.max(s.entrada, s.saida)), 0);
  if (teto <= 0) return <Vazio />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={serie} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gEntrada" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--success)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} {...eixo} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[0, Math.ceil(teto * 1.15)]}
            tickFormatter={(v: number) => curto(v)}
            {...eixo}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.25 }}
            content={({ active, payload, label }) => (
              <Caixa
                ativo={active}
                rotulo={String(label ?? "")}
                itens={(payload ?? []).map((p) => ({
                  name: p.dataKey === "entrada" ? "Entrada" : "Saída",
                  value: p.value as number,
                  color: p.dataKey === "entrada" ? "var(--success)" : "var(--danger)",
                }))}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="entrada"
            stroke="var(--success)"
            strokeWidth={2.5}
            fill="url(#gEntrada)"
            animationDuration={400}
          />
          <Bar
            dataKey="saida"
            fill="var(--danger)"
            fillOpacity={0.75}
            radius={[4, 4, 0, 0]}
            barSize={serie.length > 20 ? 6 : 14}
            animationDuration={400}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ranking: barra deitada, campeão em cor cheia, o resto esmaecido. */
export function BarrasRanking({
  itens,
  cor = "var(--primary)",
  formato = "moeda",
}: {
  itens: { nome: string; valor: number; extra?: string }[];
  cor?: string;
  formato?: "moeda" | "quantidade";
}) {
  if (!itens.length || itens.every((i) => !i.valor)) {
    return <Vazio texto="Nada vendido neste período" />;
  }
  const altura = Math.max(120, itens.length * 42);
  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={itens} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nome"
            width={110}
            tickLine={false}
            axisLine={false}
            {...eixo}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            content={({ active, payload }) => (
              <Caixa
                ativo={active}
                rotulo={String(payload?.[0]?.payload?.nome ?? "")}
                itens={[
                  {
                    name: formato === "moeda" ? "Total" : "Vendidos",
                    value: payload?.[0]?.value as number,
                    color: cor,
                  },
                ]}
              />
            )}
          />
          <Bar dataKey="valor" radius={[6, 6, 6, 6]} animationDuration={400} barSize={20}>
            {itens.map((i, k) => (
              <Cell
                key={i.nome}
                fill={cor}
                fillOpacity={k === 0 ? 1 : 0.85 - Math.min(k, 4) * 0.13}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Linha de tendência mínima: cabe ao lado de um número. */
export function Tendencia({
  valores,
  cor = "var(--primary)",
}: {
  valores: number[];
  cor?: string;
}) {
  if (valores.length < 2) return null;
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const faixa = max - min || 1;
  const pontos = valores
    .map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - ((v - min) / faixa) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-20" aria-hidden="true">
      <polyline
        points={pontos}
        fill="none"
        stroke={cor}
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
