import { Layers, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { GrupoOpcao } from "@/components/pdv/comum";
import { cn } from "@/lib/utils";

const campo =
  "mt-1.5 h-12 w-full rounded-xl border-2 border-border bg-card px-4 text-base font-normal outline-none transition-colors focus:border-primary";

const sugestoes = ["Complementos", "Adicionais", "Calda", "Cobertura", "Recipiente"];

/**
 * Grupos extras com nome livre, no mesmo padrão dos sabores: cada grupo é um
 * cartão numerado (o olho segue a ordem em que o caixa vai escolher).
 */
export function EditorGrupos({
  grupos,
  onChange,
}: {
  grupos: GrupoOpcao[];
  onChange: (g: GrupoOpcao[]) => void;
}) {
  const mudar = (i: number, g: Partial<GrupoOpcao>) =>
    onChange(grupos.map((x, k) => (k === i ? { ...x, ...g } : x)));

  const novo = (nome = "") => {
    if (grupos.length >= 10) return toast.error("Máximo de 10 grupos");
    onChange([...grupos, { nome, multi: true, opcoes: [] }]);
  };

  const usadas = new Set(grupos.map((g) => g.nome.toLowerCase()));

  return (
    <div className="sm:col-span-2">
      <span className="flex items-center gap-2 text-sm font-bold">
        <Layers className="size-4 text-primary" />
        Outros grupos (mesmo preço)
      </span>
      <p className="text-xs font-normal text-muted-foreground">
        Crie grupos com o nome que quiser — Complementos, Calda, Adicional. Na venda aparecem logo
        depois dos sabores, e são opcionais.
      </p>

      <div className="mt-3 grid gap-3">
        {grupos.map((g, i) => (
          <div
            key={i}
            className="fade-in rounded-2xl border-2 border-border border-l-4 border-l-primary bg-secondary/20 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                {i + 1}
              </span>
              <input
                value={g.nome}
                onChange={(e) => mudar(i, { nome: e.target.value.slice(0, 40) })}
                placeholder="Nome do grupo (ex.: Complementos)"
                aria-label="Nome do grupo"
                className={cn(campo, "mt-0 font-bold")}
              />
              <button
                type="button"
                aria-label={`Excluir grupo ${g.nome || i + 1}`}
                onClick={() => {
                  if (g.opcoes.length && !confirm(`Excluir o grupo "${g.nome || "sem nome"}"?`)) return;
                  onChange(grupos.filter((_, k) => k !== i));
                }}
                className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-5" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {g.opcoes.map((o, k) => (
                <span
                  key={`${o}-${k}`}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-card pl-3 pr-1 text-sm font-bold"
                >
                  {o}
                  <button
                    type="button"
                    aria-label={`Remover ${o}`}
                    onClick={() => mudar(i, { opcoes: g.opcoes.filter((_, j) => j !== k) })}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger"
                  >
                    <X className="size-4" />
                  </button>
                </span>
              ))}
            </div>
            <input
              placeholder="Digite uma opção e aperte Enter"
              aria-label={`Nova opção em ${g.nome || "grupo"}`}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const v = e.currentTarget.value.trim().slice(0, 40);
                if (!v) return;
                if (g.opcoes.some((o) => o.toLowerCase() === v.toLowerCase()))
                  return toast.error("Essa opção já está no grupo");
                mudar(i, { opcoes: [...g.opcoes, v] });
                e.currentTarget.value = "";
              }}
              className={campo}
            />

            {/* Duas regras, lado a lado: o dono escolhe com um toque. */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { v: false, t: "Escolhe 1" },
                { v: true, t: "Pode vários" },
              ].map((op) => (
                <button
                  key={op.t}
                  type="button"
                  aria-pressed={g.multi === op.v}
                  onClick={() => mudar(i, { multi: op.v })}
                  className={cn(
                    "press h-10 rounded-xl border-2 text-sm font-bold transition-colors",
                    g.multi === op.v
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {op.t}
                </button>
              ))}
            </div>
            {g.nome.trim() && !g.opcoes.length ? (
              <p className="mt-2 text-xs font-bold text-warning-foreground">
                Sem opções, este grupo não aparece na venda.
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => novo()}
          className="press flex h-11 items-center gap-2 rounded-xl border-2 border-dashed border-primary px-4 text-sm font-black text-primary hover:bg-primary-soft"
        >
          <Plus className="size-4" />
          Adicionar grupo
        </button>
        {sugestoes
          .filter((s) => !usadas.has(s.toLowerCase()))
          .slice(0, 3)
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => novo(s)}
              className="press h-11 rounded-xl bg-secondary px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}
