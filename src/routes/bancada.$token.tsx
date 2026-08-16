import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChefHat, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AvisoErro } from "@/components/aviso-erro";
import { QuadroPreparo } from "@/components/preparo/quadro";
import {
  listarBancada,
  marcarBancada,
  reordenarBancada,
  type EtapaPreparo,
  type ItemPreparo,
} from "@/lib/preparo.functions";

export const Route = createFileRoute("/bancada/$token")({
  head: () => ({
    meta: [
      { title: "Bancada de preparo — acesso por senha | EG Mix" },
      {
        name: "description",
        content:
          "Tela compartilhada da bancada: pedidos em ordem, com hora e cronômetro, aberta por link e senha da loja.",
      },
      { property: "og:title", content: "Bancada de preparo — acesso por senha | EG Mix" },
      {
        property: "og:description",
        content: "Aparelho da cozinha acompanha e dá baixa nos pedidos sem precisar de login.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BancadaPage,
});

const CHAVE = "egmix.bancada.senha";

function BancadaPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const [senha, setSenha] = useState("");
  const [rascunho, setRascunho] = useState("");

  /* A senha fica só neste aparelho: quem abriu uma vez não digita de novo. */
  useEffect(() => {
    setSenha(window.sessionStorage.getItem(`${CHAVE}.${token}`) ?? "");
  }, [token]);

  const buscar = useServerFn(listarBancada);
  const mover = useServerFn(marcarBancada);
  const reordenar = useServerFn(reordenarBancada);

  const fila = useQuery({
    queryKey: ["bancada", token, senha],
    queryFn: () => buscar({ data: { token, senha } }),
    enabled: senha.length > 0,
    retry: false,
    refetchInterval: 5000,
  });

  const chave = ["bancada", token, senha];
  const marcar = useMutation({
    mutationFn: (v: { id: string; etapa: EtapaPreparo }) => mover({ data: { token, senha, ...v } }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData(chave);
      qc.setQueryData(chave, (lista: ItemPreparo[] | undefined) =>
        (lista ?? [])
          .map((i) => (i.id === v.id ? { ...i, etapa: v.etapa } : i))
          .filter((i) => i.etapa !== "delivered"),
      );
      return { antes };
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(chave, ctx?.antes);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  });

  const [falhouEm, setFalhouEm] = useState<string | null>(null);
  const ordenar = useMutation({
    mutationFn: (ids: string[]) => reordenar({ data: { token, senha, ids } }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData(chave);
      qc.setQueryData(chave, (lista: ItemPreparo[] | undefined) =>
        (lista ?? []).map((i) => {
          const k = ids.indexOf(i.id);
          return k < 0 ? i : { ...i, ordem: (k + 1) * 10 };
        }),
      );
      return { antes };
    },
    onError: (e: Error, ids, ctx) => {
      qc.setQueryData(chave, ctx?.antes);
      setFalhouEm(ids[0] ?? null);
      window.setTimeout(() => setFalhouEm(null), 700);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  });


  function entrar(e: React.FormEvent) {
    e.preventDefault();
    window.sessionStorage.setItem(`${CHAVE}.${token}`, rascunho);
    setSenha(rascunho);
  }

  function sair() {
    window.sessionStorage.removeItem(`${CHAVE}.${token}`);
    setSenha("");
    setRascunho("");
  }

  /* Porta de entrada: uma pergunta só, campo grande, nada mais na tela. */
  if (!senha || (fila.isError && !fila.data)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <form
          onSubmit={entrar}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
        >
          <ChefHat className="size-10 text-primary" />
          <h1 className="mt-3 font-display text-3xl leading-none tracking-wide">Bancada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Digite a senha que a loja definiu para acompanhar os pedidos neste aparelho.
          </p>

          {fila.isError && senha ? (
            <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger">
              {(fila.error as Error).message}
            </p>
          ) : null}

          <label className="mt-4 block">
            <span className="eyebrow text-muted-foreground">Senha da bancada</span>
            <input
              type="password"
              autoFocus
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              className="mt-1 h-14 w-full rounded-xl border-2 border-border bg-background px-4 text-center font-display text-2xl tracking-[0.3em] focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={!rascunho}
            className="press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-2xl tracking-wide text-primary-foreground disabled:opacity-50"
          >
            <KeyRound className="size-5" />
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const itens = fila.data ?? [];

  return (
    <main className="min-h-screen bg-background">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl leading-none tracking-wide">Bancada</h1>
          <p className="truncate text-xs font-bold text-muted-foreground">
            {itens.length} {itens.length === 1 ? "item" : "itens"} na fila
          </p>
        </div>
        <button
          type="button"
          onClick={sair}
          className="press flex h-11 items-center gap-2 rounded-xl border-2 border-border px-3 text-sm font-bold text-muted-foreground"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </header>

      <div className="p-4">
        {fila.isError ? (
          <AvisoErro erro={fila.error} aoTentar={() => fila.refetch()} />
        ) : (
          <QuadroPreparo
            itens={itens}
            ritmo={{ cronometro: true, alertaMin: 8, atrasoMin: 15 }}
            aoMarcar={(id, etapa) => marcar.mutate({ id, etapa })}
            aoReordenar={(ids) => ordenar.mutate(ids)}
            falhouEm={falhouEm}

          />
        )}
      </div>
    </main>
  );
}
