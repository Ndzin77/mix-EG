import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Explicação sob demanda. O texto longo sai da tela e fica atrás de um "i":
 * quem já sabe não lê de novo (menos carga cognitiva), quem precisa toca uma
 * vez. Funciona no mouse (passar por cima) e no dedo (toque).
 */
export function Dica({ texto, className }: { texto: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);

  const medir = () => {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const largura = 240;
    setPos({
      top: r.bottom + 8,
      left: Math.min(Math.max(r.left + r.width / 2 - largura / 2, 12), window.innerWidth - largura - 12),
    });
  };

  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={texto}
        onMouseEnter={() => {
          medir();
          setAberto(true);
        }}
        onMouseLeave={() => setAberto(false)}
        onClick={(e) => {
          e.stopPropagation();
          medir();
          setAberto((v) => !v);
        }}
        className={cn(
          "no-print inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary",
          className,
        )}
      >
        <Info className="size-4" />
      </button>

      {aberto && pos
        ? createPortal(
            <div
              role="tooltip"
              style={{ top: pos.top, left: pos.left, width: 240 }}
              className="modal-in fixed z-[70] rounded-xl border-2 border-border bg-card px-3 py-2 text-xs font-semibold leading-snug text-muted-foreground shadow-2xl"
            >
              {texto}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
