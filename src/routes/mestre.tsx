import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Copy,
  Download,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorLoja } from "@/components/mestre/editor-loja";
import { NovoCliente } from "@/components/mestre/novo-cliente";
import { RaioXLoja } from "@/components/mestre/raio-x";
import { AcessoLoja } from "@/components/mestre/acesso-loja";
import { ResumoPlataforma } from "@/components/mestre/resumo-plataforma";
import { BarraLote } from "@/components/mestre/barra-lote";
import { useConfirmar } from "@/components/confirmar";
import {
  anotarLoja,
  criarCliente,
  definirSenhaCliente,
  enviarLinkSenha,
  listarLojas,
  lojasEmLote,
  removerCliente,
  resumoLoja,
  sairMestre,
  salvarAssinatura,
  souMestre,
} from "@/lib/mestre.functions";
import type { LojaMestre } from "@/lib/mestre.server";
import { baixarCsv } from "@/lib/exportar";
import gestorPro from "@/assets/gestor-pro.png";
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
type Ordem = "vence" | "venda" | "nova" | "nome";

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

function desde(iso: string | null) {
  if (!iso) return "nunca vendeu";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "vendeu hoje";
  if (dias === 1) return "vendeu ontem";
  return `sem vender há ${dias} dias`;
}

function PainelMestre() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmar = useConfirmar();

  const conferir = useServerFn(souMestre);
  const ler = useServerFn(listarLojas);
  const salvar = useServerFn(salvarAssinatura);
  const criar = useServerFn(criarCliente);
  const remover = useServerFn(removerCliente);
  const sair = useServerFn(sairMestre);
  const lerResumo = useServerFn(resumoLoja);
  const trocarSenha = useServerFn(definirSenhaCliente);
  const mandarLink = useServerFn(enviarLinkSenha);
  const anotar = useServerFn(anotarLoja);
  const lote = useServerFn(lojasEmLote);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ordem, setOrdem] = useState<Ordem>("vence");
  const [editando, setEditando] = useState<LojaMestre | null>(null);
  const [criando, setCriando] = useState(false);
  const [raioX, setRaioX] = useState<LojaMestre | null>(null);
  const [acesso, setAcesso] = useState<LojaMestre | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);

  /* Desfazer no lugar de "tem certeza?": ação reversível não merece atrito. */
  const [desfazer, setDesfazer] = useState<{ texto: string; acao: () => void } | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const oferecerDesfazer = (texto: string, acao: () => void) => {
    if (timer.current) window.clearTimeout(timer.current);
    setDesfazer({ texto, acao });
    timer.current = window.setTimeout(() => setDesfazer(null), 6000);
  };

  const sessao = useQuery({ queryKey: ["mestre-sessao"], queryFn: () => conferir(), retry: false });
  const liberado = sessao.data?.ok === true;

  const lojas = useQuery({
    queryKey: ["mestre-lojas"],
    queryFn: () => ler(),
    enabled: liberado,
    retry: false,
  });

  const dadosRaioX = useQuery({
    queryKey: ["mestre-raiox", raioX?.tenantId],
    queryFn: () => lerResumo({ data: { tenantId: raioX!.tenantId } }),
    enabled: !!raioX,
    retry: false,
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ["mestre-lojas"] });

  const mSalvar = useMutation({
    mutationFn: (v: { tenantId: string; liberado: boolean; dias: number; preco?: number }) =>
      salvar({ data: v }),
    onSuccess: async (_r, v) => {
      await recarregar();
      setEditando(null);
      toast.success(v.liberado ? `Liberado por ${v.dias} dias.` : "Loja bloqueada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar."),
  });

  const mCriar = useMutation({
    mutationFn: (v: { email: string; senha: string; loja: string; nome: string; dias: number }) =>
      criar({ data: v }),
    onSuccess: async () => {
      await recarregar();
      setCriando(false);
      toast.success("Cliente criado e liberado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para criar."),
  });

  const mRemover = useMutation({
    mutationFn: (tenantId: string) => remover({ data: { tenantId } }),
    onSuccess: async () => {
      await recarregar();
      toast.success("Cliente removido.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para remover."),
  });

  const mSenha = useMutation({
    mutationFn: (v: { tenantId: string; senha: string }) => trocarSenha({ data: v }),
    onSuccess: (r) => toast.success(`Senha trocada${r.email ? ` para ${r.email}` : ""}.`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para trocar a senha."),
  });

  const mLink = useMutation({
    mutationFn: (tenantId: string) => mandarLink({ data: { tenantId } }),
    onSuccess: (r) => toast.success(`Link enviado para ${r.email}.`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para enviar o link."),
  });

  const mNota = useMutation({
    mutationFn: (v: { tenantId: string; nota: string }) => anotar({ data: v }),
    onSuccess: async () => {
      await recarregar();
      toast.success("Anotação guardada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para guardar."),
  });

  const mLote = useMutation({
    mutationFn: (v: { tenantIds: string[]; liberado: boolean; dias: number }) =>
      lote({ data: v }),
    onSuccess: async (r, v) => {
      await recarregar();
      setMarcadas([]);
      toast.success(
        v.liberado ? `${r.quantas} loja(s) liberadas por ${v.dias} dias.` : `${r.quantas} loja(s) bloqueadas.`,
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para aplicar em lote."),
  });

  const todas = lojas.data ?? [];

  const geral = useMemo(() => {
    let ativas = 0;
    let vencendo = 0;
    let bloqueadas = 0;
    let receita = 0;
    for (const l of todas) {
      const s = situacao(l);
      if (s.cor === "success") ativas++;
      if (s.cor === "warning") vencendo++;
      if (s.cor === "danger") bloqueadas++;
      if (s.cor !== "danger") receita += l.preco;
    }
    return { ativas, vencendo, bloqueadas, receita };
  }, [todas]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = todas.filter((l) => {
      const s = situacao(l);
      if (filtro === "pagos" && s.cor !== "success") return false;
      if (filtro === "vencendo" && s.cor !== "warning") return false;
      if (filtro === "bloqueados" && s.cor !== "danger") return false;
      if (!termo) return true;
      return `${l.loja} ${l.email ?? ""} ${l.nome ?? ""}`.toLowerCase().includes(termo);
    });

    return filtradas.sort((a, b) => {
      if (ordem === "nome") return a.loja.localeCompare(b.loja, "pt-BR");
      if (ordem === "nova")
        return new Date(b.criadaEm ?? 0).getTime() - new Date(a.criadaEm ?? 0).getTime();
      if (ordem === "venda")
        return new Date(a.ultimaVenda ?? 0).getTime() - new Date(b.ultimaVenda ?? 0).getTime();
      return situacao(a).dias - situacao(b).dias;
    });
  }, [todas, busca, filtro, ordem]);

  const marcar = (id: string) =>
    setMarcadas((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const exportar = () => {
    baixarCsv(`lojas-gestor-pro-${new Date().toISOString().slice(0, 10)}`, [
      ["Loja", "Dono", "E-mail", "Situação", "Dias restantes", "Vence em", "Plano", "Preço", "Última venda", "Produtos ativos", "Anotação"],
      ...lista.map((l) => {
        const s = situacao(l);
        return [
          l.loja,
          l.nome ?? "",
          l.email ?? "",
          s.rotulo,
          s.dias,
          l.venceEm ? new Date(l.venceEm).toLocaleDateString("pt-BR") : "",
          l.plano,
          l.preco,
          l.ultimaVenda ? new Date(l.ultimaVenda).toLocaleDateString("pt-BR") : "",
          l.produtosAtivos,
          l.anotacao ?? "",
        ];
      }),
    ]);
    toast.success("Planilha baixada.");
  };

  const copiarFicha = (l: LojaMestre) => {
    const s = situacao(l);
    void navigator.clipboard.writeText(
      [
        `Loja: ${l.loja}`,
        `Dono: ${l.nome ?? "—"}`,
        `E-mail: ${l.email ?? "—"}`,
        `Situação: ${s.rotulo} (${s.dias} dias)`,
        `Vence em: ${l.venceEm ? new Date(l.venceEm).toLocaleDateString("pt-BR") : "—"}`,
        `Plano: ${l.plano} · R$ ${l.preco.toFixed(2)}`,
      ].join("\n"),
    );
    toast.success("Ficha copiada.");
  };

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
    <main className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b-2 border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <img
            src={gestorPro}
            alt="Gestor Pro"
            className="h-11 w-auto shrink-0 object-contain mix-blend-multiply"
          />
          <div className="mr-auto min-w-0">
            <h1 className="font-display text-2xl leading-none tracking-wide">Painel Mestre</h1>
            <p className="text-xs text-muted-foreground">{todas.length} loja(s) na plataforma</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void lojas.refetch()}
            aria-label="Atualizar"
            className="press h-12 rounded-xl px-4"
          >
            <RefreshCw className={cn("size-5", lojas.isFetching && "animate-spin")} />
          </Button>
          <Button
            variant="secondary"
            onClick={exportar}
            aria-label="Baixar planilha"
            className="press h-12 rounded-xl px-4"
          >
            <Download className="size-5" />
          </Button>
          <Button onClick={() => setCriando(true)} className="press h-12 rounded-xl px-5 font-bold">
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
        <ResumoPlataforma
          ativas={geral.ativas}
          vencendo={geral.vencendo}
          bloqueadas={geral.bloqueadas}
          receita={geral.receita}
          filtro={filtro}
          onFiltro={(f) => setFiltro((atual) => (atual === f ? "todos" : f))}
        />

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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="eyebrow text-muted-foreground">Ordenar por</span>
          {(
            [
              ["vence", "Vence antes"],
              ["venda", "Última venda"],
              ["nova", "Mais recente"],
              ["nome", "Nome"],
            ] as [Ordem, string][]
          ).map(([chave, rotulo]) => (
            <button
              key={chave}
              type="button"
              onClick={() => setOrdem(chave)}
              className={cn(
                "press h-10 rounded-lg border-2 px-3 text-xs font-bold",
                ordem === chave ? "border-primary bg-primary/10" : "border-border bg-secondary/40",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {lojas.isLoading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/60" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">Nenhuma loja com esse filtro.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {lista.map((l) => {
              const s = situacao(l);
              const marcada = marcadas.includes(l.tenantId);
              return (
                <li
                  key={l.tenantId}
                  className={cn(
                    "results-pop flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4 transition-shadow",
                    s.cor === "success"
                      ? "border-success/50 bg-success-soft"
                      : s.cor === "warning"
                        ? "border-warning/50 bg-warning/10"
                        : "border-danger/50 bg-danger/10",
                    marcada && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => marcar(l.tenantId)}
                    aria-label={`Selecionar ${l.loja}`}
                    className="size-6 shrink-0 accent-current"
                  />

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
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {desde(l.ultimaVenda)} · {l.produtosAtivos} produto(s) ativo(s)
                      {l.anotacao ? ` · ${l.anotacao}` : ""}
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
                      onClick={() => {
                        const antes = situacao(l).dias;
                        mSalvar.mutate({
                          tenantId: l.tenantId,
                          liberado: true,
                          dias: 30,
                          preco: l.preco,
                        });
                        oferecerDesfazer(`+30 dias em ${l.loja}`, () =>
                          mSalvar.mutate({
                            tenantId: l.tenantId,
                            liberado: antes > 0,
                            dias: Math.max(1, antes),
                            preco: l.preco,
                          }),
                        );
                      }}
                      className="press h-12 rounded-xl px-3 text-sm font-bold"
                    >
                      +30 dias
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setRaioX(l)}
                      aria-label="Raio-X da loja"
                      className="press h-12 rounded-xl px-3"
                    >
                      <Stethoscope className="size-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => copiarFicha(l)}
                      aria-label="Copiar ficha"
                      className="press h-12 rounded-xl px-3"
                    >
                      <ClipboardCopy className="size-5" />
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
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: `Remover ${l.loja}?`,
                          descricao: `Apaga a conta de ${l.email ?? "—"} e todos os dados dessa loja. Não tem volta.`,
                          confirmar: "Remover para sempre",
                        });
                        if (ok) mRemover.mutate(l.tenantId);
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

      {desfazer ? (
        <div className="modal-in fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(92vw,28rem)] items-center gap-3 rounded-2xl border-2 border-primary/40 bg-card p-3 shadow-2xl">
          <span className="mr-auto text-sm font-bold">{desfazer.texto}</span>
          <Button
            variant="secondary"
            onClick={() => {
              desfazer.acao();
              setDesfazer(null);
            }}
            className="press h-11 rounded-xl px-4 text-sm font-bold"
          >
            <Undo2 className="mr-1 size-4" /> Desfazer
          </Button>
        </div>
      ) : null}

      <BarraLote
        quantas={marcadas.length}
        trabalhando={mLote.isPending}
        onLiberar={(dias) => mLote.mutate({ tenantIds: marcadas, liberado: true, dias })}
        onBloquear={() => mLote.mutate({ tenantIds: marcadas, liberado: false, dias: 1 })}
        onLimpar={() => setMarcadas([])}
      />

      {editando ? (
        <EditorLoja
          loja={editando}
          salvando={mSalvar.isPending}
          salvandoNota={mNota.isPending}
          onFechar={() => setEditando(null)}
          onSalvar={(v) => mSalvar.mutate({ tenantId: editando.tenantId, ...v })}
          onAcesso={() => setAcesso(editando)}
          onRaioX={() => setRaioX(editando)}
          onAnotar={(nota) => mNota.mutate({ tenantId: editando.tenantId, nota })}
        />
      ) : null}

      {raioX ? (
        <RaioXLoja
          loja={raioX}
          dados={dadosRaioX.data}
          carregando={dadosRaioX.isLoading}
          onFechar={() => setRaioX(null)}
        />
      ) : null}

      {acesso ? (
        <AcessoLoja
          loja={acesso}
          salvando={mSenha.isPending}
          enviando={mLink.isPending}
          onFechar={() => setAcesso(null)}
          onDefinir={(senha) => mSenha.mutate({ tenantId: acesso.tenantId, senha })}
          onEnviarLink={() => mLink.mutate(acesso.tenantId)}
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
