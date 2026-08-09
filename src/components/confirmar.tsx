import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/modal";

/**
 * Confirmação única da casa: nada é excluído sem a dona dizer que sim.
 * Uso: `const confirmar = useConfirmar(); if (await confirmar({...})) apagar()`.
 */
type Pedido = {
  titulo: string;
  descricao?: string;
  confirmar?: string;
};

type Aberto = Pedido & { resolver: (ok: boolean) => void };

const Ctx = createContext<((p: Pedido) => Promise<boolean>) | null>(null);

export function ProvedorConfirmacao({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState<Aberto | null>(null);

  const pedir = useCallback(
    (p: Pedido) => new Promise<boolean>((resolver) => setAberto({ ...p, resolver })),
    [],
  );

  const fechar = (ok: boolean) => {
    aberto?.resolver(ok);
    setAberto(null);
  };

  const valor = useMemo(() => pedir, [pedir]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      {aberto ? (
        <Modal
          titulo={aberto.titulo}
          onFechar={() => fechar(false)}
          rodape={
            <>
              <button
                type="button"
                onClick={() => fechar(false)}
                className="press h-12 flex-1 rounded-xl border-2 border-border font-bold hover:border-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => fechar(true)}
                className="press h-12 flex-1 rounded-xl bg-danger font-bold text-danger-foreground"
              >
                {aberto.confirmar ?? "Excluir"}
              </button>
            </>
          }
        >
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
              <AlertTriangle className="size-5" />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {aberto.descricao ?? "Esta ação não pode ser desfeita."}
            </p>
          </div>
        </Modal>
      ) : null}
    </Ctx.Provider>
  );
}

export function useConfirmar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirmar precisa do ProvedorConfirmacao");
  return ctx;
}
