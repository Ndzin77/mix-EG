import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const CHAVE = "egmix.sanfona.v1";

function lidas(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

/** Bloco da casa: nasce aberto (a dona quer ver tudo ao entrar) e lembra no
 *  aparelho o que ela preferiu fechar. */
export function Sanfona({
  titulo,
  resumo,
  aberto: inicial = true,
  children,
}: {
  titulo: string;
  resumo?: ReactNode;
  aberto?: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(inicial);

  /* A leitura do que ficou salvo acontece só depois de hidratar, para o
     servidor e o navegador desenharem a mesma coisa na primeira pintura. */
  useEffect(() => {
    const guardado = lidas()[titulo];
    if (typeof guardado === "boolean") setAberto(guardado);
  }, [titulo]);

  function alternar() {
    setAberto((v) => {
      const proximo = !v;
      try {
        window.localStorage.setItem(CHAVE, JSON.stringify({ ...lidas(), [titulo]: proximo }));
      } catch {
        /* modo privado: vale só nesta sessão */
      }
      return proximo;
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-primary transition-transform",
            aberto && "rotate-180",
          )}
        />
        <h2 className="font-display text-lg tracking-wide">{titulo}</h2>
        {resumo ? (
          <span className="ml-auto text-xs font-bold text-muted-foreground">{resumo}</span>
        ) : null}
      </button>
      {aberto ? <div className="border-t border-border p-5">{children}</div> : null}
    </section>
  );
}
