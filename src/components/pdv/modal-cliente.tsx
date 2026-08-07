import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { brl, rotulosMesa, useConfig } from "@/lib/config";

/** Pop-up de destino da conta: um toque resolve o nome na maioria dos casos. */
export function ModalCliente({
  total,
  nome,
  setNome,
  pendente,
  onFechar,
  onConfirmar,
}: {
  total: number;
  nome: string;
  setNome: (v: string) => void;
  pendente: boolean;
  onFechar: () => void;
  onConfirmar: (nome: string) => void;
}) {
  const [config] = useConfig();
  const atalhos = useMemo(() => [...rotulosMesa(config), ...config.destinos], [config]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="De quem é essa conta"
      className="overlay-in fixed inset-0 z-50 grid place-items-center bg-foreground/45 p-4"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border-2 border-warning/40 bg-card shadow-2xl"
      >
        <div className="h-1.5 bg-warning" />
        <div className="p-6">
          <p className="eyebrow text-muted-foreground">Anotar R$ {brl(total)}</p>
          <h2 className="font-display text-3xl leading-tight tracking-wide">
            De quem é essa conta?
          </h2>

          {atalhos.length > 0 ? (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {atalhos.map((s) => (
                <button
                  key={s}
                  onClick={() => onConfirmar(s)}
                  className="press h-14 rounded-xl border-2 border-border bg-secondary/40 text-sm font-black uppercase tracking-wide transition-colors hover:border-warning hover:bg-warning-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              value={nome}
              autoFocus
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onConfirmar(nome);
                }
              }}
              placeholder="Ou digite o nome (ex.: Ana do flocos)"
              aria-label="Nome do cliente"
              className="h-14 rounded-xl border-2 border-border bg-secondary/30 px-4 text-lg font-bold outline-none focus:border-warning focus:bg-card"
            />
            <button
              onClick={() => onConfirmar(nome)}
              disabled={pendente}
              className="press glow-warning h-14 rounded-xl bg-warning px-6 font-display text-2xl tracking-wide text-warning-foreground disabled:opacity-50"
            >
              {pendente ? <Loader2 className="size-6 animate-spin" /> : "Anotar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
