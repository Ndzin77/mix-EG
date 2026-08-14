import { useMemo, useState } from "react";
import { IceCream, Plus, SlidersHorizontal, X } from "lucide-react";
import { brl } from "@/lib/config";
import { useImagens } from "@/lib/imagens";
import { cn } from "@/lib/utils";
import { seloPreco, type Produto } from "./comum";

const TODOS = "Todos";

/**
 * Grade de produtos — o vazio virou área de trabalho.
 * Sem carrinho, a tela inteira é catálogo tocável: foto grande para o olho
 * reconhecer antes de ler, abas por categoria para a lista nunca rolar demais.
 */
export function GradeProdutos({
  catalogo,
  carregando,
  onAdd,
}: {
  catalogo: Produto[];
  carregando: boolean;
  onAdd: (p: Produto) => void;
}) {
  /** `null` = nada escolhido: a tela fica limpa até a dona pedir o cardápio. */
  const [aba, setAba] = useState<string | null>(null);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const urlDe = useImagens(catalogo.map((p) => p.foto));

  /* Abas só de categorias de verdade: quem não tem categoria fica em "Todos"
     e o código do produto nunca vira aba. */
  const categorias = useMemo(() => {
    const vistas: string[] = [];
    for (const p of catalogo) {
      const k = p.detalhe?.trim();
      if (k && !vistas.includes(k)) vistas.push(k);
    }
    return vistas.sort((a, b) => a.localeCompare(b));
  }, [catalogo]);

  const visiveis = useMemo(
    () =>
      aba === null
        ? []
        : aba === TODOS
          ? catalogo
          : catalogo.filter((p) => (p.detalhe?.trim() ?? "") === aba),
    [catalogo, aba],
  );


  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-foreground/8" />
        ))}
      </div>
    );
  }

  if (!catalogo.length) {
    return (
      <div className="m-auto max-w-sm rounded-2xl border-2 border-dashed border-border bg-card/60 p-8 text-center">
        <p className="font-display text-3xl tracking-wide">Cardápio vazio</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre os sabores no Admin, com foto, e eles aparecem aqui em botões grandes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* Filtro fechado e nada escolhido: a tela fica livre. O cardápio só
          aparece quando a dona pede — por categoria ou inteiro. */}
      <div className="sticky top-0 z-10 -mx-1 bg-background/85 px-1 py-1 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setFiltroAberto((v) => {
                /* Abrir o filtro já mostra o cardápio inteiro. */
                if (!v && aba === null) setAba(TODOS);
                return !v;
              })
            }
            aria-expanded={filtroAberto}
            className="press flex h-10 shrink-0 items-center gap-2 rounded-xl border-2 border-border bg-card px-3 text-xs font-black uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
            {filtroAberto ? "Fechar" : "Filtrar"}
          </button>
          {/* Com algo escolhido, o selo mostra o quê — e o "x" volta ao limpo. */}
          {!filtroAberto && aba !== null ? (
            <button
              onClick={() => setAba(null)}
              aria-label={`Limpar filtro ${aba}`}
              className="press flex min-w-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wide text-primary-foreground"
            >
              <span className="truncate">{aba}</span>
              <X className="size-3.5 shrink-0" />
            </button>
          ) : null}
        </div>

        {/* Trocar de categoria não fecha o filtro: ele só fecha em "Fechar". */}
        {filtroAberto ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {[TODOS, ...categorias].map((c) => (
              <button
                key={c}
                onClick={() => setAba(c)}
                className={cn(
                  "press h-10 shrink-0 rounded-xl border-2 px-4 text-sm font-black uppercase tracking-wide transition-colors",
                  aba === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {aba === null ? null : (

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visiveis.map((p, i) => {
            const foto = urlDe(p.foto);
            return (

            <button
              key={p.id}
              onClick={() => onAdd(p)}
              style={{ animationDelay: `${Math.min(i, 10) * 18}ms` }}
              className={cn(
                "rise-in press group relative flex flex-col overflow-hidden rounded-2xl border-2 border-border",
                "bg-card text-left hover:border-primary hover:shadow-xl",
              )}
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary-soft to-secondary/60">
                {foto ? (
                  <img
                    src={foto}
                    alt={p.nome}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="grid size-full place-items-center">
                    <IceCream className="size-9 text-primary/50" />
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col justify-between gap-1 p-3">
                <span className="line-clamp-2 text-sm font-bold leading-tight">{p.nome}</span>
                {seloPreco(p) ? (
                  <span className="w-fit rounded-md bg-primary-soft px-2 py-1 text-xs font-black uppercase tracking-wide text-primary">
                    {seloPreco(p)}
                  </span>
                ) : (
                  <span className="money text-2xl leading-none text-primary">R$ {brl(p.preco)}</span>
                )}
              </span>
              <Plus className="absolute right-2.5 top-2.5 size-7 rounded-full bg-card/90 p-1 text-primary opacity-0 shadow transition-opacity group-hover:opacity-100" />
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

