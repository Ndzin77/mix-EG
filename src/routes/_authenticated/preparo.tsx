import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { AvisoErro } from "@/components/aviso-erro";
import { QuadroPreparo } from "@/components/preparo/quadro";
import {
  listarPreparo,
  marcarPreparo,
  reordenarPreparo,
  type EtapaPreparo,
  type ItemPreparo,
} from "@/lib/preparo.functions";
import { useConfig } from "@/lib/config";

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

function PreparoPage() {
  const [config] = useConfig();
  const qc = useQueryClient();
  const buscar = useServerFn(listarPreparo);
  const mover = useServerFn(marcarPreparo);
  const reordenar = useServerFn(reordenarPreparo);

  const fila = useQuery({
    queryKey: ["preparo"],
    queryFn: () => buscar(),
    /* A bancada não tem tempo de apertar "atualizar". */
    refetchInterval: 5000,
  });

  const itens = fila.data ?? [];

  const marcar = useMutation({
    mutationFn: (v: { id: string; etapa: EtapaPreparo }) => mover({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["preparo"] });
      const antes = qc.getQueryData(["preparo"]);
      qc.setQueryData(["preparo"], (lista: ItemPreparo[] | undefined) =>
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

  const ordenar = useMutation({
    mutationFn: (ids: string[]) => reordenar({ data: { ids } }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ["preparo"] });
      const antes = qc.getQueryData(["preparo"]);
      qc.setQueryData(["preparo"], (lista: ItemPreparo[] | undefined) =>
        (lista ?? []).map((i) => {
          const k = ids.indexOf(i.id);
          return k < 0 ? i : { ...i, ordem: (k + 1) * 10 };
        }),
      );
      return { antes };
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(["preparo"], ctx?.antes);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["preparo"] }),
  });

  return (
    <AppShell>
      <PageHeader
        title="Fila de preparo"
        subtitle="Arraste para mudar a ordem — o #1 é sempre o próximo"
        actions={
          <span className="rounded-xl bg-secondary px-3 py-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-24 md:pb-5">
        {fila.isError ? (
          <AvisoErro erro={fila.error} aoTentar={() => fila.refetch()} />
        ) : (
          <QuadroPreparo
            itens={itens}
            ritmo={{
              cronometro: config.cronometroAtivo,
              alertaMin: config.alertaMin,
              atrasoMin: config.atrasoMin,
            }}
            aoMarcar={(id, etapa) => marcar.mutate({ id, etapa })}
            aoReordenar={(ids) => ordenar.mutate(ids)}
          />
        )}
      </div>
    </AppShell>
  );
}
