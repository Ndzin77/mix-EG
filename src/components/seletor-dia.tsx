import { ChevronLeft, ChevronRight } from "lucide-react";

/** O caixa fecha por dia — Saídas e Caixa navegam pela mesma data. */
export const hoje = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export const somarDias = (dia: string, n: number) => {
  const d = new Date(`${dia}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const rotuloDia = (dia: string) => {
  if (dia === hoje()) return "Hoje";
  if (dia === somarDias(hoje(), -1)) return "Ontem";
  return new Date(`${dia}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
};

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function SeletorDia({
  dia,
  onChange,
}: {
  dia: string;
  onChange: (dia: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      <button
        onClick={() => onChange(somarDias(dia, -1))}
        aria-label="Dia anterior"
        className="press rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="min-w-[5.5rem] text-center font-display text-xl leading-none tracking-wide">
        {rotuloDia(dia)}
      </span>
      <input
        type="date"
        value={dia}
        max={hoje()}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label="Escolher dia"
        className="h-9 rounded-lg border border-border bg-secondary/40 px-2 text-sm font-bold outline-none focus:border-primary"
      />
      <button
        onClick={() => onChange(somarDias(dia, 1))}
        disabled={dia >= hoje()}
        aria-label="Dia seguinte"
        className="press rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
