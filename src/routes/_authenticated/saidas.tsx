import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, Trash2, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useConfirmar } from "@/components/confirmar";
import { useContagem } from "@/components/pdv/comum";
import { hora } from "@/components/seletor-dia";
import { SeletorPeriodo } from "@/components/periodo/seletor-periodo";
import { brl, useConfig } from "@/lib/config";
import { diaIso, intervaloPreset, rotuloIntervalo, type Intervalo } from "@/lib/relatorios";
import { excluirSaida, listarSaidas } from "@/lib/saidas.functions";
import { enviar } from "@/lib/offline";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/saidas")({
  head: () => ({
    meta: [
      { title: "Saídas do dia — despesas e retiradas | Doce PDV" },
      {
        name: "description",
        content:
          "Lance despesas e retiradas da loja por categoria e veja para onde o dinheiro do dia foi.",
      },
      { property: "og:title", content: "Saídas do dia — despesas e retiradas | Doce PDV" },
      {
        property: "og:description",
        content: "Despesas e retiradas gravadas por empresa, com categorias e histórico do dia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaidasPage,
});

type Lancamento = { description: string; amount: number; category: string };

function SaidasPage() {
  const [config] = useConfig();
  const [periodo, setPeriodo] = useState<Intervalo>(() => intervaloPreset("hoje"));
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [cat, setCat] = useState<string>("");
  const [desfazer, setDesfazer] = useState<Lancamento | null>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const categorias = config.categoriasSaida;
  const hojeIso = diaIso(new Date());
  const rotulo = rotuloIntervalo(periodo).toLowerCase();

  /* A lista de categorias é da loja: se a dona apagar a escolhida, cai na primeira. */
  useEffect(() => {
    if (categorias.length && !categorias.includes(cat)) setCat(categorias[0] ?? "");
  }, [categorias, cat]);

  const queryClient = useQueryClient();
  const confirmar = useConfirmar();
  const buscarSaidas = useServerFn(listarSaidas);
  const apagar = useServerFn(excluirSaida);

  const saidasQuery = useQuery({
    queryKey: ["saidas", periodo.de, periodo.ate],
    queryFn: () => buscarSaidas({ data: { de: periodo.de, ate: periodo.ate } }),
  });

  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: ["saidas"] });
    queryClient.invalidateQueries({ queryKey: ["caixa"] });
  };

  /* Sem internet a saída fica guardada no aparelho e sobe quando o sinal volta. */
  const criar = useMutation({
    mutationFn: (v: Lancamento) =>
      enviar<{ id: string }>(
        "saida",
        {
          ...v,
          occurred_at: periodo.ate === hojeIso ? undefined : `${periodo.ate}T12:00:00`,
        },
        `a saída "${v.description}"`,
      ),
    onSuccess: (envio) => {
      recarregar();
      if (envio.offline) toast.warning("Sem internet: saída guardada no aparelho.");
      descRef.current?.focus();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const remover = useMutation({
    mutationFn: (id: string) => apagar({ data: { id } }),
    onSuccess: () => recarregar(),
    onError: (e: Error) => {
      setDesfazer(null);
      toast.error(e.message);
    },
  });

  const saidas = saidasQuery.data ?? [];

  const numero = Number(valor.replace(",", "."));
  const valido = desc.trim().length > 1 && numero > 0;

  const total = useMemo(() => saidas.reduce((s, x) => s + x.amount, 0), [saidas]);
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    saidas.forEach((s) => mapa.set(s.category, (mapa.get(s.category) ?? 0) + s.amount));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [saidas]);
  const maior = porCategoria[0];

  const totalAnimado = useContagem(total);

  const registrar = () => {
    if (!valido || criar.isPending) return;
    criar.mutate({ description: desc.trim(), amount: numero, category: cat });
    setDesc("");
    setValor("");
  };

  return (
    <AppShell>
      <PageHeader
        title="Saídas"
        subtitle="Despesas e retiradas da loja"
        actions={<SeletorPeriodo valor={periodo} onMudar={setPeriodo} />}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-24 md:pb-5">
        {/* Vermelho contínuo do topo ao rodapé: em 1 segundo o operador sabe que
            está na tela onde dinheiro sai, não onde dinheiro entra. */}
        <section className="rounded-2xl border-l-4 border-danger bg-card p-5 shadow-sm">
          <span className="eyebrow flex items-center gap-1.5 text-danger">
            <ArrowDownRight className="size-4" />
            Registrar saída {periodo.ate === hojeIso ? "" : `em ${periodo.ate}`}
          </span>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_auto]">
            <input
              ref={descRef}
              autoFocus
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && registrar()}
              placeholder="O que saiu? Ex.: caixa de casquinhas"
              aria-label="Descrição da saída"
              className="h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-lg font-medium outline-none transition-colors focus:border-danger focus:bg-card"
            />
            <div className="relative">
              <span className="money pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                R$
              </span>
              <input
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && registrar()}
                placeholder="0,00"
                aria-label="Valor da saída"
                className="money h-14 w-full rounded-xl border-2 border-border bg-secondary/30 pl-12 pr-4 text-2xl outline-none transition-colors focus:border-danger focus:bg-card"
              />
            </div>
            <button
              onClick={registrar}
              disabled={!valido || criar.isPending}
              className={cn(
                "press h-14 rounded-xl bg-danger px-8 font-display text-2xl tracking-wider text-danger-foreground",
                "disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              {criar.isPending ? "Lançando…" : "Lançar"}
              <span className="kbd ml-1 align-middle">Enter</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {categorias.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma categoria configurada — a saída vai sem categoria. Monte a sua lista no
                Admin.
              </p>
            ) : null}
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "press rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors",
                  cat === c
                    ? "border-danger bg-danger-soft text-danger"
                    : "border-border bg-card text-muted-foreground hover:border-danger/40",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {desfazer ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft px-4 py-2.5">
            <p className="truncate text-sm font-semibold">{desfazer.description} removido</p>
            <button
              onClick={() => {
                criar.mutate(desfazer);
                setDesfazer(null);
              }}
              className="press flex shrink-0 items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-bold hover:bg-accent"
            >
              <Undo2 className="size-4" />
              Desfazer
            </button>
          </div>
        ) : null}

        {/* Proporção antes de número: para onde o dinheiro está vazando é uma
            pergunta visual, não aritmética. */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl tracking-wide">Onde o dinheiro saiu</h2>
            <span className="money text-2xl leading-none text-danger">− R$ {brl(totalAnimado)}</span>
          </div>
          {porCategoria.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma saída em {rotulo} — gaveta intacta.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {porCategoria.map(([nome, v]) => (
                <li key={nome}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{nome}</span>
                    <span className="money text-base">R$ {brl(v)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-danger transition-all duration-500"
                      style={{ width: `${total ? (v / total) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {maior ? (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Maior categoria: <strong className="text-foreground">{maior[0]}</strong> · R${" "}
              {brl(maior[1])}
            </p>
          ) : null}
        </div>

        <section className="mt-4 rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 font-display text-xl tracking-wide">
            Lançamentos · {rotulo}
          </h2>
          <ul>
            {saidasQuery.isLoading ? (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando…</li>
            ) : saidas.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhuma saída registrada — gaveta intacta.
              </li>
            ) : (
              saidas.map((s, i) => (
                <li
                  key={s.id}
                  style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                  className="rise-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight">{s.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {hora(s.occurred_at)} · {s.category}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="money text-2xl leading-none text-danger">
                      − R$ {brl(s.amount)}
                    </p>
                    <button
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: `Excluir a saída "${s.description}"?`,
                          descricao: "O valor volta para o resultado do dia.",
                        });
                        if (!ok) return;
                        setDesfazer({
                          description: s.description,
                          amount: s.amount,
                          category: s.category,
                        });
                        remover.mutate(s.id);
                      }}

                      aria-label={`Remover ${s.description}`}
                      className="press rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <Link
          to="/caixa"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Wallet className="size-4" />
          Ver o caixa do dia
        </Link>
      </div>
    </AppShell>
  );
}
