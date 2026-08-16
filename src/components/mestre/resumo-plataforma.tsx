import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Contagem que sobe: o movimento curto prende o olhar no número que mudou. */
function useSobe(alvo: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let quadro = 0;
    const inicio = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / 420);
      setV(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo]);
  return v;
}

function Cartao({
  valor,
  rotulo,
  cor,
  ativo,
  moeda,
  onClick,
}: {
  valor: number;
  rotulo: string;
  cor: "success" | "warning" | "danger" | "neutro";
  ativo?: boolean;
  moeda?: boolean;
  onClick?: () => void;
}) {
  const v = useSobe(valor);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press rounded-2xl border-2 p-4 text-left transition-colors",
        cor === "success"
          ? "border-success/50 bg-success-soft"
          : cor === "warning"
            ? "border-warning/50 bg-warning/10"
            : cor === "danger"
              ? "border-danger/50 bg-danger/10"
              : "border-border bg-secondary/40",
        ativo && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <span className="block font-display text-4xl leading-none tracking-wide tabular-nums">
        {moeda
          ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
          : Math.round(v)}
      </span>
      <span className="mt-1 block text-xs font-bold text-muted-foreground">{rotulo}</span>
    </button>
  );
}

/** Painel de altitude: em dois segundos você sabe se o mês está de pé. */
export function ResumoPlataforma({
  ativas,
  vencendo,
  bloqueadas,
  receita,
  filtro,
  onFiltro,
}: {
  ativas: number;
  vencendo: number;
  bloqueadas: number;
  receita: number;
  filtro: string;
  onFiltro: (f: "pagos" | "vencendo" | "bloqueados") => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Cartao
        valor={ativas}
        rotulo="lojas pagas"
        cor="success"
        ativo={filtro === "pagos"}
        onClick={() => onFiltro("pagos")}
      />
      <Cartao
        valor={vencendo}
        rotulo="vencem em 3 dias"
        cor="warning"
        ativo={filtro === "vencendo"}
        onClick={() => onFiltro("vencendo")}
      />
      <Cartao
        valor={bloqueadas}
        rotulo="bloqueadas"
        cor="danger"
        ativo={filtro === "bloqueados"}
        onClick={() => onFiltro("bloqueados")}
      />
      <Cartao valor={receita} rotulo="receita mensal" cor="neutro" moeda />
    </div>
  );
}
