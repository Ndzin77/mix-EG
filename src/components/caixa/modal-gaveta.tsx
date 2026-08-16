import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { useContagem } from "@/components/pdv/comum";
import { brl } from "@/lib/config";
import { cn } from "@/lib/utils";

const MOTIVOS: Record<"entrada" | "saida", string[]> = {
  entrada: ["Troco inicial", "Aporte", "Dinheiro que já estava"],
  saida: ["Sangria", "Depósito", "Retirada"],
};

const ATALHOS = [20, 50, 100, 200];

/** Ajuste da gaveta física: entrada (troco/aporte) ou saída (sangria).
 *  Cor = significado, e o rodapé mostra a gaveta depois do lançamento antes
 *  de confirmar — a pessoa "sente" o efeito sem precisar calcular. */
export function ModalGaveta({
  gavetaAtual,
  onFechar,
  onConfirmar,
  salvando,
}: {
  gavetaAtual: number;
  onFechar: () => void;
  onConfirmar: (dados: { kind: "entrada" | "saida"; amount: number; note: string }) => void;
  salvando: boolean;
}) {
  const [kind, setKind] = useState<"entrada" | "saida">("entrada");
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");

  const numero = useMemo(() => {
    const n = Number(valor.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  }, [valor]);

  const depois = gavetaAtual + (kind === "saida" ? -numero : numero);
  const depoisAnimado = useContagem(depois);
  const valido = numero > 0 && !salvando;

  const confirmar = () => {
    if (!valido) return;
    navigator.vibrate?.(18);
    onConfirmar({ kind, amount: numero, note: nota.trim() });
  };

  return (
    <Modal
      titulo="Ajustar a gaveta"
      subtitulo="Dinheiro que entrou ou saiu da gaveta sem ser venda nem despesa"
      onFechar={onFechar}
      rodape={
        <>
          <div className="mr-auto">
            <p className="eyebrow text-muted-foreground">A gaveta fica com</p>
            <p
              className={cn(
                "money text-3xl leading-none tabular-nums",
                depois < 0 ? "text-danger" : "text-foreground",
              )}
            >
              R$ {brl(depoisAnimado)}
            </p>
          </div>
          <button
            type="button"
            onClick={confirmar}
            disabled={!valido}
            className={cn(
              "press flex h-14 min-w-44 items-center justify-center gap-2 rounded-2xl px-6 text-lg font-black uppercase tracking-wide transition-all disabled:opacity-40",
              kind === "entrada" ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground",
            )}
          >
            {salvando ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Check className="size-5" />
            )}
            Lançar {kind === "entrada" ? "entrada" : "saída"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["entrada", "Entrou na gaveta", ArrowDownLeft, "success"],
            ["saida", "Saiu da gaveta", ArrowUpRight, "danger"],
          ] as const
        ).map(([chave, rotulo, Icone, cor]) => {
          const ativo = kind === chave;
          return (
            <button
              key={chave}
              type="button"
              onClick={() => setKind(chave)}
              aria-pressed={ativo}
              className={cn(
                "press flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-sm font-black uppercase tracking-wide transition-all",
                ativo
                  ? cor === "success"
                    ? "border-success bg-success-soft text-success scale-[1.02]"
                    : "border-danger bg-danger-soft text-danger scale-[1.02]"
                  : "border-border bg-secondary/30 text-muted-foreground",
              )}
            >
              <Icone className="size-6" />
              {rotulo}
            </button>
          );
        })}
      </div>

      <label className="mt-5 block text-xs font-black uppercase tracking-wide text-muted-foreground">
        Valor
        <input
          autoFocus
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
          placeholder="0,00"
          className="money mt-1 h-20 w-full rounded-2xl border-2 border-border bg-secondary/30 px-4 text-5xl tabular-nums text-foreground outline-none focus:border-primary"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        {ATALHOS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setValor(String(v).replace(".", ","))}
            className="press rounded-xl border-2 border-border px-4 py-2 text-sm font-black tabular-nums transition-colors hover:border-primary"
          >
            R$ {v}
          </button>
        ))}
        {valor ? (
          <button
            type="button"
            onClick={() => setValor("")}
            className="press ml-auto rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground hover:text-danger"
          >
            Limpar
          </button>
        ) : null}
      </div>

      <label className="mt-5 block text-xs font-black uppercase tracking-wide text-muted-foreground">
        Motivo (opcional)
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, 80))}
          placeholder="Ex.: troco inicial do dia"
          className="mt-1 h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-sm font-bold outline-none focus:border-primary"
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-2">
        {MOTIVOS[kind].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setNota(m)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              nota === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary",
            )}
          >
            {m}
          </button>
        ))}
      </div>
    </Modal>
  );
}
