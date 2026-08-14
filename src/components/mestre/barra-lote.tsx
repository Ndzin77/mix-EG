import { Lock, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Barra de lote: aparece só quando existe seleção, colada no rodapé, para a
 * ação ficar debaixo do polegar e nunca competir com a lista.
 */
export function BarraLote({
  quantas,
  trabalhando,
  onLiberar,
  onBloquear,
  onLimpar,
}: {
  quantas: number;
  trabalhando: boolean;
  onLiberar: (dias: number) => void;
  onBloquear: () => void;
  onLimpar: () => void;
}) {
  if (quantas === 0) return null;
  return (
    <div className="modal-in fixed inset-x-0 bottom-0 z-40 border-t-2 border-primary/30 bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="mr-auto font-display text-2xl leading-none tracking-wide tabular-nums">
          {quantas}
          <span className="ml-2 font-sans text-xs font-bold text-muted-foreground">
            loja(s) selecionada(s)
          </span>
        </span>

        {[30, 90].map((d) => (
          <Button
            key={d}
            disabled={trabalhando}
            onClick={() => onLiberar(d)}
            className="press h-12 rounded-xl bg-success px-4 font-bold text-success-foreground hover:bg-success/90"
          >
            <Unlock className="mr-1 size-4" /> +{d} dias
          </Button>
        ))}

        <Button
          variant="secondary"
          disabled={trabalhando}
          onClick={onBloquear}
          className="press h-12 rounded-xl px-4 font-bold text-danger"
        >
          <Lock className="mr-1 size-4" /> Bloquear
        </Button>

        <Button
          variant="secondary"
          onClick={onLimpar}
          aria-label="Limpar seleção"
          className="press h-12 rounded-xl px-3"
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
