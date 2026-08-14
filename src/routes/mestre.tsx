import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, LogOut, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorLoja } from "@/components/mestre/editor-loja";
import { NovoCliente } from "@/components/mestre/novo-cliente";
import {
  criarCliente,
  listarLojas,
  removerCliente,
  sairMestre,
  salvarAssinatura,
  souMestre,
} from "@/lib/mestre.functions";
import type { LojaMestre } from "@/lib/mestre.server";
import gestorPro from "@/assets/gestor-pro.png.asset.json";
import {
  WEBHOOK_URL,
  WEBHOOK_URL_FUNCAO,
  WEBHOOK_URL_SUPABASE,
  WEBHOOK_URL_TESTE,
  EVENTOS_KIRVANO,
} from "@/lib/assinatura";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mestre")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Mestre — Gestor Pro" },
      { name: "description", content: "Controle das lojas assinantes do Gestor Pro." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel Mestre — Gestor Pro" },
      { property: "og:description", content: "Área restrita de administração da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <p className="font-display text-2xl tracking-wide">Não foi possível abrir o painel mestre.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center bg-background">
      <p className="font-display text-2xl tracking-wide">Página não encontrada.</p>
    </main>
  ),
  component: PainelMestre,
});

type Filtro = "todos" | "pagos" | "vencendo" | "bloqueados";

function situacao(l: LojaMestre) {
  const pago =
    l.status === "active" &&
    ["SALE_APPROVED", "SUBSCRIPTION_APPROVED", "SUBSCRIPTION_RENEWED"].includes(
      (l.ultimoEvento ?? "").toUpperCase(),
    );
  const dias = l.venceEm
    ? Math.ceil((new Date(l.venceEm).getTime() - Date.now()) / 86_400_000)
    : 0;
  if (!pago || dias <= 0) return { cor: "danger" as const, rotulo: "Bloqueado", dias: 0 };
  if (dias <= 3) return { cor: "warning" as const, rotulo: "Vencendo", dias };
  return { cor: "success" as const, rotulo: "Pago", dias };
}

function PainelMestre() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const conferir = useServerFn(souMestre);
  const ler = useServerFn(listarLojas);
  const salvar = useServerFn(salvarAssinatura);
  const criar = useServerFn(criarCliente);
  const remover = useServerFn(removerCliente);
  const sair = useServerFn(sairMestre);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editando, setEditando] = useState<LojaMestre | null>(null);
  const [criando, setCriando] = useState(false);

  const sessao = useQuery({ queryKey: ["mestre-sessao"], queryFn: () => conferir(), retry: false });
  const liberado = sessao.data?.ok === true;

  const lojas = useQuery({
    queryKey: ["mestre-lojas"],
    queryFn: () => ler(),
    enabled: liberado,
    retry: false,
  });

  const mSalvar = useMutation({
    mutationFn: (v: { tenantId: string; liberado: boolean; dias: number; preco?: number }) =>
      salvar({ data: v }),
    onSuccess: async (_r, v) => {
      await queryClient.invalidateQueries({ queryKey: ["mestre-lojas"] });
      setEditando(null);
      toast.success(v.liberado ? `Liberado por ${v.dias} dias.` : "Loja bloqueada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar."),
  });

  const mCriar = useMutation({
    mutationFn: (v: { email: string; senha: string; loja: string; nome: string; dias: number }) =>
      criar({ data: v }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mestre-lojas"] });
      setCriando(false);
      toast.success("Cliente criado e liberado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para criar."),
  });

  const mRemover = useMutation({
    mutationFn: (tenantId: string) => remover({ data: { tenantId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mestre-lojas"] });
      toast.success("Cliente removido.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para remover."),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lojas.data ?? [])
      .filter((l) => {
        const s = situacao(l);
        if (filtro === "pagos" && s.cor !== "success") return false;
        if (filtro === "vencendo" && s.cor !== "warning") return false;
        if (filtro === "bloqueados" && s.cor !== "danger") return false;
        if (!termo) return true;
        return `${l.loja} ${l.email ?? ""} ${l.nome ?? ""}`.toLowerCase().includes(termo);
      })
      .sort((a, b) => situacao(a).dias - situacao(b).dias);
  }, [lojas.data, busca, filtro]);

  if (sessao.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <p className="font-display text-2xl tracking-wide text-muted-foreground">Conferindo…</p>
      </main>
    );
  }

  if (!liberado) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="modal-in max-w-sm">
          <p className="font-display text-3xl leading-none tracking-wide">Área restrita</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre pela tela de login com a combinação de administrador.
          </p>
          <Button
            onClick={() => navigate({ to: "/auth", replace: true })}
            className="press mt-5 h-14 w-full rounded-xl text-lg font-bold"
          >
            Ir para o login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b-2 border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <img
            src={gestorPro.url}
            alt="Gestor Pro"
            className="h-11 w-auto shrink-0 object-contain mix-blend-multiply"
          />
          <div className="mr-auto min-w-0">
            <h1 className="font-display text-2xl leading-none tracking-wide">Painel Mestre</h1>
            <p className="text-xs text-muted-foreground">
              {lojas.data?.length ?? 0} loja(s) na plataforma
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void lojas.refetch()}
            className="press h-12 rounded-xl px-4"
          >
            <RefreshCw className={cn("size-5", lojas.isFetching && "animate-spin")} />
          </Button>
          <Button
            onClick={() => setCriando(true)}
            className="press h-12 rounded-xl px-5 font-bold"
          >
            <Plus className="mr-1 size-5" /> Novo cliente
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await sair();
              queryClient.clear();
              navigate({ to: "/auth", replace: true });
            }}
            className="press h-12 rounded-xl px-4"
            aria-label="Sair do modo mestre"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4">
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por e-mail ou nome da loja"
              className="h-14 w-full rounded-xl border-2 border-border bg-secondary/30 pl-11 pr-3 text-base outline-none focus:border-primary focus:bg-card"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["todos", "Todos"],
                ["pagos", "Pagos"],
                ["vencendo", "Vencendo"],
                ["bloqueados", "Bloqueados"],
              ] as [Filtro, string][]
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                onClick={() => setFiltro(chave)}
                className={cn(
                  "press h-12 rounded-xl border-2 px-4 text-sm font-bold",
                  filtro === chave ? "border-primary bg-primary/10" : "border-border bg-secondary/40",
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {lojas.isLoading ? (
          <p className="mt-10 text-center text-muted-foreground">Carregando lojas…</p>
        ) : lista.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">Nenhuma loja com esse filtro.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {lista.map((l) => {
              const s = situacao(l);
              return (
                <li
                  key={l.tenantId}
                  className={cn(
                    "results-pop flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4",
                    s.cor === "success"
                      ? "border-success/50 bg-success-soft"
                      : s.cor === "warning"
                        ? "border-warning/50 bg-warning/10"
                        : "border-danger/50 bg-danger/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setEditando(l)}
                    className="press mr-auto min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate font-display text-2xl leading-none tracking-wide">
                      {l.loja}
                    </span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">
                      {l.email ?? "sem e-mail"}
                    </span>
                  </button>

                  <div className="text-right">
                    <span className="eyebrow block text-muted-foreground">{s.rotulo}</span>
                    <span className="font-display text-3xl leading-none tracking-wide tabular-nums">
                      {s.dias}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">dias</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        mSalvar.mutate({ tenantId: l.tenantId, liberado: true, dias: 30, preco: l.preco })
                      }
                      className="press h-12 rounded-xl px-3 text-sm font-bold"
                    >
                      +30 dias
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(l.email ?? "");
                        toast.success("E-mail copiado.");
                      }}
                      aria-label="Copiar e-mail"
                      className="press h-12 rounded-xl px-3"
                    >
                      <Copy className="size-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remover ${l.email ?? l.loja} e todos os dados dessa loja? Não tem volta.`,
                          )
                        ) {
                          mRemover.mutate(l.tenantId);
                        }
                      }}
                      aria-label="Remover cliente"
                      className="press h-12 rounded-xl px-3 text-danger"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Coisa de plataforma, não de lojista: os endereços do webhook agora
            moram aqui, longe da tela de assinatura do cliente. */}
        <Kirvano />
      </div>



      {editando ? (
        <EditorLoja
          loja={editando}
          salvando={mSalvar.isPending}
          onFechar={() => setEditando(null)}
          onSalvar={(v) => mSalvar.mutate({ tenantId: editando.tenantId, ...v })}
        />
      ) : null}

      {criando ? (
        <NovoCliente
          salvando={mCriar.isPending}
          onFechar={() => setCriando(false)}
          onCriar={(v) => mCriar.mutate(v)}
        />
      ) : null}
    </main>
  );
}

/**
 * Configuração da Kirvano — área da plataforma. Fechado por padrão: só abre
 * quando alguém vai realmente mexer no webhook.
 */
function Kirvano() {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const enderecos: [string, string, string][] = [
    ["Função no Supabase (recomendado)", WEBHOOK_URL_FUNCAO, "Endereço fixo, não depende do domínio."],
    ["Supabase (alternativo)", WEBHOOK_URL_SUPABASE, "Mesma função, outro caminho."],
    ["Aplicativo publicado", WEBHOOK_URL, "Usa o domínio do sistema."],
    ["Ambiente de teste", WEBHOOK_URL_TESTE, "Só para conferir antes de valer."],
  ];

  const copiar = (url: string) => {
    void navigator.clipboard.writeText(url);
    setCopiado(url);
    toast.success("Endereço copiado.");
    window.setTimeout(() => setCopiado(null), 1600);
  };

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border-2 border-border bg-card">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <ShieldCheck className="size-5 shrink-0 text-muted-foreground" />
        <span className="mr-auto text-sm font-bold">Configuração da Kirvano (webhook)</span>
        <span className="text-xs font-bold text-muted-foreground">
          {aberto ? "Fechar" : "Abrir"}
        </span>
      </button>

      {aberto ? (
        <div className="grid gap-3 border-t border-border p-5">
          {enderecos.map(([nome, url, ajuda]) => (
            <div key={url} className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-sm font-bold">{nome}</p>
              <p className="text-xs text-muted-foreground">{ajuda}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-card px-3 py-2 text-xs">
                  {url}
                </code>
                <Button
                  variant="secondary"
                  onClick={() => copiar(url)}
                  className={cn(
                    "press h-10 shrink-0 rounded-lg px-3 text-xs font-bold",
                    copiado === url && "bg-success text-success-foreground hover:bg-success",
                  )}
                >
                  <Copy className="size-4" />
                  {copiado === url ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="eyebrow text-muted-foreground">Eventos a marcar na Kirvano</p>
            <ul className="mt-2 grid gap-1 text-sm font-bold">
              {EVENTOS_KIRVANO.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
