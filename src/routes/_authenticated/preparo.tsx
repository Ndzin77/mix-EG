import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChefHat, Check, CookingPot, Hand, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { AvisoErro } from "@/components/aviso-erro";
import { Foto } from "@/components/pdv/comum";
import { useImagens } from "@/lib/imagens";
import { listarPreparo, marcarPreparo, type EtapaPreparo } from "@/lib/preparo.functions";
import { useConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/preparo")({
  head: () => ({
    meta: [
      { title: "Fila de preparo — pedidos na bancada | EG Mix" },
      {
        name: "description",
        content:
          "Tela do ajudante: pedidos em ordem de chegada, com foto, quantidade e tempo de espera até a entrega.",
      },
      { property: "og:title", content: "Fila de preparo — pedidos na bancada | EG Mix" },
      {
        property: "og:description",
        content: "Pedidos anotados no balcão aparecem aqui em ordem, do mais antigo ao mais novo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PreparoPage,
});

const colunas: { etapa: EtapaPreparo; titulo: string; icone: typeof ChefHat; cor: string }[] = [
  { etapa: "todo", titulo: "A fazer", icone: Hand, cor: "border-warning" },
  { etapa: "doing", titulo: "Montando", icone: CookingPot, cor: "border-primary" },
  { etapa: "done", titulo: "Pronto — entregar", icone: Check, cor: "border-success" },
];

/** Minutos inteiros desde que o pedido caiu na fila. */
function minutos(desde: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60000));
}

function PreparoPage() {
  const [config] = useConfig();
  const qc = useQueryClient();
  const buscar = useServerFn(listarPreparo);
  const mover = useServerFn(marcarPreparo);

  /* Relógio único da tela: um tique por segundo move todos os cronômetros. */
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const fila = useQuery({
    queryKey: ["preparo"],
    queryFn: () => buscar(),
    /* A bancada não tem tempo de apertar "atualizar". */
    refetchInterval: 5000,
  });

  const itens = useMemo(() => fila.data ?? [], [fila.data]);
  const urlDe = useImagens(itens.map((i) => i.foto));

  const marcar = useMutation({
    mutationFn: (v: { id: string; etapa: EtapaPreparo }) => mover({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["preparo"] });
      const antes = qc.getQueryData(["preparo"]);
      qc.setQueryData(["preparo"], (lista: typeof itens | undefined) =>
        (lista ?? [])
          .map((i) => (i.id === v.id ? { ...i, etapa: v.etapa } : i))
          .filter((i) => i.etapa !== "delivered"),
      );
      return { antes };
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(["preparo"], ctx?.antes);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["preparo"] }),
  });

  const porEtapa = (e: EtapaPreparo) => itens.filter((i) => i.etapa === e);

  return (
    <AppShell>
      <PageHeader
        title="Fila de preparo"
        subtitle="O bilhete de papel virou tela — do mais antigo para o mais novo"
        actions={
          <span className="rounded-xl bg-secondary px-3 py-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
            {itens.length} {itens.length === 1 ? "item" : "itens"} na bancada
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-24 md:pb-5">
        {fila.isError ? (
          <AvisoErro erro={fila.error} aoTentar={() => fila.refetch()} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {colunas.map((col) => {
              const lista = porEtapa(col.etapa);
              return (
                <section
                  key={col.etapa}
                  className={cn("rounded-2xl border-t-4 bg-card p-4 shadow-sm", col.cor)}
                >
                  <h2 className="flex items-center justify-between gap-2 font-display text-2xl tracking-wide">
                    <span className="flex items-center gap-2">
                      <col.icone className="size-5 text-muted-foreground" />
                      {col.titulo}
                    </span>
                    <span className="money text-xl text-muted-foreground">{lista.length}</span>
                  </h2>

                  <ul className="mt-3 space-y-3">
                    {lista.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        {col.etapa === "todo"
                          ? "Nada esperando — bancada limpa."
                          : col.etapa === "doing"
                            ? "Ninguém montando agora."
                            : "Nada esperando o cliente."}
                      </li>
                    ) : (
                      lista.map((i) => {
                        const min = minutos(i.criadoEm, agora);
                        const urgente = config.cronometroAtivo && min >= config.atrasoMin;
                        const atencao = config.cronometroAtivo && min >= config.alertaMin;
                        return (
                          <li
                            key={i.id}
                            className={cn(
                              "rise-in rounded-xl border-2 bg-background p-3",
                              urgente
                                ? "animate-pulse border-danger"
                                : atencao
                                  ? "border-warning"
                                  : "border-border",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Foto
                                produto={{ nome: i.produto, foto: i.foto }}
                                url={urlDe(i.foto)}
                                className="size-14"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-display text-xl leading-tight tracking-wide">
                                  {i.quantidade > 1 ? `${i.quantidade}× ` : ""}
                                  {i.produto}
                                </p>
                                <p className="truncate text-sm font-bold text-muted-foreground">
                                  {i.conta}
                                </p>
                              </div>
                              {config.cronometroAtivo ? (
                                <span
                                  className={cn(
                                    "money shrink-0 rounded-lg px-2 py-1 text-lg tabular-nums",
                                    urgente
                                      ? "bg-danger text-danger-foreground"
                                      : atencao
                                        ? "bg-warning-soft text-warning-foreground"
                                        : "bg-secondary text-muted-foreground",
                                  )}
                                >
                                  {min}min
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-3 flex gap-2">
                              {col.etapa !== "todo" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    marcar.mutate({
                                      id: i.id,
                                      etapa: col.etapa === "doing" ? "todo" : "doing",
                                    })
                                  }
                                  aria-label="Voltar uma etapa"
                                  className="press grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-border text-muted-foreground hover:border-primary"
                                >
                                  <Undo2 className="size-5" />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  marcar.mutate({
                                    id: i.id,
                                    etapa:
                                      col.etapa === "todo"
                                        ? "doing"
                                        : col.etapa === "doing"
                                          ? "done"
                                          : "delivered",
                                  })
                                }
                                className={cn(
                                  "press h-12 flex-1 rounded-xl font-display text-xl tracking-wide",
                                  col.etapa === "todo"
                                    ? "bg-primary text-primary-foreground"
                                    : col.etapa === "doing"
                                      ? "bg-success text-success-foreground"
                                      : "bg-foreground text-background",
                                )}
                              >
                                {col.etapa === "todo"
                                  ? "Começar"
                                  : col.etapa === "doing"
                                    ? "Pronto"
                                    : "Entregue"}
                              </button>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
