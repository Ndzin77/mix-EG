import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { TravaSecao } from "@/components/trava-secao";
import { SeletorPeriodo } from "@/components/periodo/seletor-periodo";
import { ModalRecibo } from "@/components/recibo/recibo";
import { FechamentoDias } from "@/components/relatorios/fechamento-dias";
import { HistoricoVendas } from "@/components/relatorios/historico-vendas";
import { PizzaFormas } from "@/components/relatorios/pizza-formas";
import { AreaEntradaSaida, BarrasRanking } from "@/components/relatorios/graficos";
import { Sanfona } from "@/components/relatorios/sanfona";
import { brl, useConfig } from "@/lib/config";
import { baixarCsv, linhasDetalhe, linhasResumo } from "@/lib/exportar";
import { fechamentoDiario, movimentoDetalhado, resumoPeriodo } from "@/lib/relatorios.functions";
import { reciboDaVenda } from "@/lib/vendas.functions";
import type { ReciboDados } from "@/lib/recibo";
import {
  intervaloPreset,
  rotuloAnterior,
  rotuloIntervalo,
  variacao,
  type Intervalo,
} from "@/lib/relatorios";
import { cn } from "@/lib/utils";
import { AvisoErro } from "@/components/aviso-erro";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Doce PDV" },
      {
        name: "description",
        content:
          "Fechamento por dia, produtos campeões e histórico de vendas com filtro próprio e planilha limpa.",
      },
      { property: "og:title", content: "Relatórios — Doce PDV" },
      {
        property: "og:description",
        content: "Entrada, saída e resultado por período, com fechamento diário e exportação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatoriosPage,
});

function Variacao({ agora, antes, periodo }: { agora: number; antes: number; periodo: Intervalo }) {
  const v = variacao(agora, antes);
  if (v === null) return null;
  const sobe = v >= 0;
  const Icone = sobe ? TrendingUp : TrendingDown;
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-bold",
        sobe ? "text-success" : "text-danger",
      )}
    >
      <Icone className="size-3.5" />
      {sobe ? "+" : ""}
      {v}% {rotuloAnterior(periodo)}
    </p>
  );
}

function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<Intervalo>(() => intervaloPreset("hoje"));
  const [baixando, setBaixando] = useState(false);
  const [recibo, setRecibo] = useState<ReciboDados | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [loja] = useConfig();
  const buscar = useServerFn(resumoPeriodo);
  const buscarDias = useServerFn(fechamentoDiario);
  const buscarMovimento = useServerFn(movimentoDetalhado);
  const buscarRecibo = useServerFn(reciboDaVenda);

  const offsetMin = new Date().getTimezoneOffset();

  const resumoQuery = useQuery({
    queryKey: ["relatorios", periodo.de, periodo.ate],
    queryFn: () => buscar({ data: { ...periodo, offsetMin } }),
  });

  const { data, isPending } = resumoQuery;

  const diasQuery = useQuery({
    queryKey: ["fechamento", periodo.de, periodo.ate],
    queryFn: () => buscarDias({ data: { ...periodo, offsetMin } }),
  });
  const dias = diasQuery.data ?? [];

  async function abrirRecibo(id: string) {
    setAbrindo(id);
    try {
      setRecibo(await buscarRecibo({ data: { id } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o recibo");
    } finally {
      setAbrindo(null);
    }
  }

  const margem = data?.entradas ? Math.round((data.resultado / data.entradas) * 100) : 0;
  const top = data?.top ?? [];
  const formas = Object.entries(data?.formas ?? {}).filter(([, v]) => v > 0);
  const categorias = Object.entries(data?.saidasPorCategoria ?? {});

  /* Planilha: resumida para o fechamento, detalhada (item a item, com hora,
     conta e forma de pagamento) para o contador. */
  async function exportar(modo: "resumo" | "detalhe") {
    setBaixando(true);
    try {
      if (modo === "resumo") {
        const linhasDia = await buscarDias({ data: { ...periodo, offsetMin } });
        if (!linhasDia.length) {
          toast.error("Nenhum movimento nesse período para exportar");
          return;
        }
        baixarCsv(`relatorio-resumo-${periodo.de}-a-${periodo.ate}`, linhasResumo(linhasDia));
        return;
      }
      const mov = await buscarMovimento({ data: { ...periodo, offsetMin } });
      if (!mov.length) {
        toast.error("Nenhum movimento nesse período para exportar");
        return;
      }
      baixarCsv(`relatorio-detalhe-${periodo.de}-a-${periodo.ate}`, linhasDetalhe(mov));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <AppShell>
      <TravaSecao secao="relatorios" titulo="Relatórios">
        <PageHeader
          title="Relatórios"
          subtitle="Entrada, saída e resultado — dia a dia"
          actions={<SeletorPeriodo valor={periodo} onMudar={setPeriodo} />}
        />

        <div className="print-area min-h-0 flex-1 overflow-y-auto p-5">
          {resumoQuery.isError ? (
            <AvisoErro erro={resumoQuery.error} aoTentar={() => resumoQuery.refetch()} />
          ) : isPending || !data ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-foreground/8" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Faixa de topo: os três números que respondem tudo em 2 segundos.
                Rola junto com a página — grudada, ela tampava o conteúdo. */}
              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-xl border-l-4 border-success bg-card p-4 shadow-sm">
                  <p className="eyebrow text-success">Entradas</p>
                  <p className="money mt-1 text-4xl leading-none tabular-nums text-success">
                    R$ {brl(data.entradas)}
                  </p>
                  <Variacao
                    agora={data.entradas}
                    antes={data.anterior.entradas}
                    periodo={periodo}
                  />
                </article>
                <article className="rounded-xl border-l-4 border-danger bg-card p-4 shadow-sm">
                  <p className="eyebrow text-danger">Saídas</p>
                  <p className="money mt-1 text-4xl leading-none tabular-nums text-danger">
                    R$ {brl(data.saidas)}
                  </p>
                  <Variacao agora={data.saidas} antes={data.anterior.saidas} periodo={periodo} />
                </article>
                <article
                  className={cn(
                    "rounded-xl border-l-4 bg-card p-4 shadow-sm",
                    data.resultado >= 0 ? "border-success" : "border-danger",
                  )}
                >
                  <p className="eyebrow text-muted-foreground">Resultado</p>
                  <p
                    className={cn(
                      "money mt-1 text-4xl leading-none tabular-nums",
                      data.resultado >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    R$ {brl(Math.abs(data.resultado))}
                  </p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    margem {margem}% · {data.vendas} venda{data.vendas === 1 ? "" : "s"} · ticket R${" "}
                    {brl(data.ticket)}
                  </p>
                </article>
              </div>

              <FechamentoDias
                dias={dias}
                carregando={diasQuery.isPending}
                titulo={rotuloIntervalo(periodo).toLowerCase()}
                onExportar={exportar}
                baixando={baixando}
              />

              {/* Análise fica recolhida: quem quer o porquê abre, quem quer o
                quanto já leu lá em cima. */}
              <div className="no-print grid gap-4 lg:grid-cols-2">
                <Sanfona titulo="Entrada × saída" resumo="por período">
                  <AreaEntradaSaida serie={data.serie} />
                </Sanfona>

                <Sanfona titulo="Produtos mais vendidos" resumo={top[0]?.nome ?? "—"}>
                  {top.length === 0 ? (
                    <p className="text-sm font-bold text-muted-foreground">
                      Nenhum item vendido nesse período.
                    </p>
                  ) : (
                    <>
                      <BarrasRanking
                        itens={top.map((p) => ({ nome: p.nome, valor: p.qtd }))}
                        formato="quantidade"
                      />
                      <p className="mt-1 text-xs font-bold text-muted-foreground">
                        Campeão: {top[0]?.nome} — {top[0]?.qtd}un · R$ {brl(top[0]?.valor ?? 0)}
                      </p>
                    </>
                  )}
                </Sanfona>

                <Sanfona titulo="Como entrou o dinheiro" resumo={`${formas.length} formas`}>
                  {formas.length === 0 ? (
                    <p className="text-sm font-bold text-muted-foreground">
                      Nenhuma venda paga nesse período.
                    </p>
                  ) : (
                    <PizzaFormas formas={formas} />
                  )}
                  {data.descontos > 0 ? (
                    <p className="mt-3 text-xs font-bold text-warning">
                      R$ {brl(data.descontos)} concedidos em desconto.
                    </p>
                  ) : null}
                </Sanfona>

                <Sanfona
                  titulo="Para onde foi o dinheiro"
                  resumo={`${categorias.length} categorias`}
                >
                  {categorias.length === 0 ? (
                    <p className="text-sm font-bold text-muted-foreground">
                      Nenhuma saída nesse período.
                    </p>
                  ) : (
                    <BarrasRanking
                      itens={categorias
                        .slice()
                        .sort((a, b) => b[1] - a[1])
                        .map(([nome, valor]) => ({ nome, valor }))}
                      cor="var(--danger)"
                    />
                  )}
                </Sanfona>
              </div>

              <div className="no-print">
                <HistoricoVendas periodoPadrao={periodo} onAbrir={abrirRecibo} abrindo={abrindo} />
              </div>

              <div className="no-print flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
                <span className="eyebrow mr-auto text-muted-foreground">
                  Relatório de {rotuloIntervalo(periodo).toLowerCase()}
                </span>
                <button
                  onClick={() => window.print()}
                  className="press flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-accent"
                >
                  <Printer className="size-4" />
                  Imprimir / PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {recibo ? (
          <ModalRecibo dados={recibo} loja={loja} onFechar={() => setRecibo(null)} />
        ) : null}
      </TravaSecao>
    </AppShell>
  );
}
