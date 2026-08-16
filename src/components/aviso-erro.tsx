import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Falha de leitura nunca mais vira tela vazia: a pessoa vê o motivo e o botão
 * de tentar de novo, em vez de achar que a loja perdeu o movimento.
 */
export function AvisoErro({
  erro,
  aoTentar,
}: {
  erro: unknown;
  aoTentar?: () => void;
}) {
  const msg =
    erro instanceof Error && erro.message ? erro.message : "Não consegui carregar os dados.";
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-2 text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">Não deu para carregar</p>
          <p className="text-destructive/90">{msg}</p>
        </div>
      </div>
      {aoTentar && (
        <button
          type="button"
          onClick={aoTentar}
          className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-1.5 font-medium text-destructive transition hover:bg-destructive/10"
        >
          <RotateCw className="size-3.5" />
          Tentar de novo
        </button>
      )}
    </div>
  );
}
