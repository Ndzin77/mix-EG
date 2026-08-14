import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Caixa de diálogo da casa. Formulários longos deixam de empurrar a página:
 * a dona toca no cartão, edita no modal e volta para a lista.
 */
export function Modal({
  titulo,
  subtitulo,
  onFechar,
  children,
  rodape,
  largo,
}: {
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largo?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={onFechar}
      className="overlay-in fixed inset-0 z-50 grid place-items-center bg-foreground/45 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "modal-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border-2 border-primary/25 bg-card shadow-2xl",
          largo ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight tracking-wide">{titulo}</h2>
            {subtitulo ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitulo}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="press grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {rodape ? (
          <div className="flex flex-wrap gap-3 border-t border-border bg-secondary/40 p-4">
            {rodape}
          </div>
        ) : null}
      </div>
    </div>
  );
}
