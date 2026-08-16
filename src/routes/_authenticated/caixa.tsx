import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  QrCode,
  ReceiptText,
  TriangleAlert,
  Undo2,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useContagem } from "@/components/pdv/comum";
import { Dica } from "@/components/dica";
import { ModalGaveta } from "@/components/caixa/modal-gaveta";
import { SeletorPeriodo } from "@/components/periodo/seletor-periodo";
import { brl } from "@/lib/config";
import { intervaloPreset, rotuloIntervalo, type Intervalo } from "@/lib/relatorios";
import { listarSaidas } from "@/lib/saidas.functions";
import {
  excluirAjusteGaveta,
  listarAjustesGaveta,
  salvarAjusteGaveta,
  saldoGavetaAnterior,
} from "@/lib/caixa.functions";
import { resumoCaixa } from "@/lib/vendas.functions";
import { cn } from "@/lib/utils";
import { AvisoErro } from "@/components/aviso-erro";
import { TravaSecao } from "@/components/trava-secao";


export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa do dia — fechamento e gaveta | Doce PDV" },
      {
        name: "description",
        content:
          "Feche o caixa do dia: quanto entrou por forma de pagamento, quanto saiu, quanto sobrou e o que deve estar na gaveta.",
      },
      { property: "og:title", content: "Caixa do dia — fechamento e gaveta | Doce PDV" },
      {
        property: "og:description",
        content:
          "Entradas por dinheiro, PIX, débito e crédito, saídas do dia e conferência da gaveta física.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaixaPage,
});

const formas = [
  { chave: "cash", rotulo: "Dinheiro", icone: Banknote, cor: "bg-success" },
  { chave: "pix", rotulo: "PIX", icone: QrCode, cor: "bg-primary" },
  { chave: "debit", rotulo: "Débito", icone: CreditCard, cor: "bg-foreground/50" },
  { chave: "credit", rotulo: "Crédito", icone: CreditCard, cor: "bg-warning" },
] as const;

function CaixaPage() {
  const [periodo, setPeriodo] = useState<Intervalo>(() => intervaloPreset("hoje"));
  /* O dia é o da loja, não o do servidor (UTC): sem isso a venda das 22h
     entra no dia seguinte e o caixa de hoje não mexe. */
  const offsetMin = useMemo(() => new Date().getTimezoneOffset(), []);
  /** o que a dona contou de papel na gaveta, para bater com o previsto */
  const [contado, setContado] = useState("");

  const [modal, setModal] = useState(false);
  const [pulso, setPulso] = useState(0);
  const qc = useQueryClient();

  const buscarCaixa = useServerFn(resumoCaixa);
  const buscarSaidas = useServerFn(listarSaidas);
  const buscarAjustes = useServerFn(listarAjustesGaveta);
  const buscarSaldo = useServerFn(saldoGavetaAnterior);
  const gravarAjuste = useServerFn(salvarAjusteGaveta);
  const apagarAjuste = useServerFn(excluirAjusteGaveta);

  const caixaQuery = useQuery({
    queryKey: ["caixa", periodo.de, periodo.ate, offsetMin],
    queryFn: () => buscarCaixa({ data: { de: periodo.de, ate: periodo.ate, offsetMin } }),
  });
  const saidasQuery = useQuery({
    queryKey: ["saidas", periodo.de, periodo.ate, offsetMin],
    queryFn: () => buscarSaidas({ data: { de: periodo.de, ate: periodo.ate, offsetMin } }),
  });
  const ajustesQuery = useQuery({
    queryKey: ["gaveta-ajustes", periodo.de, periodo.ate, offsetMin],
    queryFn: () => buscarAjustes({ data: { de: periodo.de, ate: periodo.ate, offsetMin } }),
  });
  const saldoQuery = useQuery({
    queryKey: ["gaveta-saldo", periodo.de, offsetMin],
    queryFn: () => buscarSaldo({ data: { de: periodo.de, ate: periodo.ate, offsetMin } }),
  });

  const caixa = caixaQuery.data;
  const saidas = saidasQuery.data ?? [];
  const ajustes = ajustesQuery.data ?? [];

  const entradas = caixa?.entradas ?? 0;
  const totalSaidas = caixa?.saidas ?? 0;
  const liquido = caixa?.liquido ?? 0;

  /* A gaveta é contínua: o que sobrou de antes + o movimento do período. */
  const saldoAnterior = saldoQuery.data?.saldo ?? 0;
  const ajustesEntrada = ajustes
    .filter((a) => a.kind === "entrada")
    .reduce((s, a) => s + a.amount, 0);
  const ajustesSaida = ajustes.filter((a) => a.kind === "saida").reduce((s, a) => s + a.amount, 0);
  const vendasDinheiro = caixa?.formas?.cash ?? 0;
  const saidasDinheiro = caixa?.saidasDinheiro ?? 0;
  const gaveta =
    Math.round(
      (saldoAnterior + vendasDinheiro + ajustesEntrada - saidasDinheiro - ajustesSaida) * 100,
    ) / 100;

  const liquidoAnimado = useContagem(liquido);
  const gavetaAnimada = useContagem(gaveta);

  const recarregarGaveta = () => {
    qc.invalidateQueries({ queryKey: ["gaveta-ajustes"] });
    qc.invalidateQueries({ queryKey: ["gaveta-saldo"] });
    setPulso((p) => p + 1);
  };

  const lancar = useMutation({
    mutationFn: (dados: { kind: "entrada" | "saida"; amount: number; note: string }) =>
      gravarAjuste({ data: { kind: dados.kind, amount: dados.amount, note: dados.note || null } }),
    onSuccess: (_r, dados) => {
      setModal(false);
      recarregarGaveta();
      toast.success(
        `${dados.kind === "entrada" ? "Entrada" : "Saída"} de R$ ${brl(dados.amount)} na gaveta`,
      );
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível lançar"),
  });

  const desfazer = useMutation({
    mutationFn: (id: string) => apagarAjuste({ data: { id } }),
    onSuccess: () => {
      recarregarGaveta();
      toast.success("Lançamento desfeito");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível desfazer"),
  });

  /* Barra proporcional: o olho compara tamanho mais rápido que número. */
  const maiorForma = Math.max(1, ...formas.map((f) => caixa?.formas?.[f.chave] ?? 0));

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    saidas.forEach((s) => mapa.set(s.category, (mapa.get(s.category) ?? 0) + s.amount));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [saidas]);

  const numeroContado = contado.trim() ? Number(contado.replace(/\./g, "").replace(",", ".")) : null;
  const diferenca =
    numeroContado !== null && Number.isFinite(numeroContado)
      ? Math.round((numeroContado - gaveta) * 100) / 100
      : null;


  return (
    <AppShell>
      <TravaSecao secao="caixa" titulo="Caixa">
      <PageHeader
        title="Caixa"
        subtitle="Entrou, saiu, sobrou e o que tem que estar na gaveta"
        actions={<SeletorPeriodo valor={periodo} onMudar={setPeriodo} />}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-24 md:pb-5">
        {caixaQuery.isError ? (
          <div className="mb-4">
            <AvisoErro erro={caixaQuery.error} aoTentar={() => caixaQuery.refetch()} />
          </div>
        ) : null}

        {/* 1º nível: o veredito do período, em um número só. */}
        <section
          className={cn(
            "rounded-2xl border-l-8 bg-card p-5 shadow-sm",
            liquido < 0 ? "border-danger" : "border-success",
          )}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow flex items-center gap-1.5 text-muted-foreground">
                Sobrou · {rotuloIntervalo(periodo).toLowerCase()}
                <Dica texto="Tudo o que entrou de vendas no período menos tudo o que foi lançado como saída. É o resultado do caixa, não o lucro do negócio." />
              </p>
              <p
                className={cn(
                  "money text-6xl leading-none tabular-nums",
                  liquido < 0 ? "text-danger" : "text-success",
                )}
              >
                R$ {brl(liquidoAnimado)}
              </p>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="eyebrow text-success">Entrou</p>
                <p className="money text-2xl leading-none tabular-nums text-success">
                  R$ {brl(entradas)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                  {caixa?.vendas ?? 0} {caixa?.vendas === 1 ? "venda" : "vendas"}
                  {caixa && caixa.descontos > 0 ? ` · R$ ${brl(caixa.descontos)} desc.` : ""}
                </p>
              </div>
              <div>
                <p className="eyebrow text-danger">Saiu</p>
                <p className="money text-2xl leading-none tabular-nums text-danger">
                  R$ {brl(totalSaidas)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                  {saidas.length} {saidas.length === 1 ? "lançamento" : "lançamentos"}
                </p>
              </div>
            </div>
          </div>

          {/* Peso visual de entrada x saída, em uma régua só. */}
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-success transition-all duration-500"
              style={{ width: `${entradas + totalSaidas ? (entradas / (entradas + totalSaidas)) * 100 : 0}%` }}
            />
            <div
              className="bg-danger transition-all duration-500"
              style={{ width: `${entradas + totalSaidas ? (totalSaidas / (entradas + totalSaidas)) * 100 : 0}%` }}
            />
          </div>
        </section>

        {caixa && caixa.contasAbertas > 0 ? (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-warning bg-warning-soft px-4 py-3">
            <TriangleAlert className="size-5 shrink-0 text-warning-foreground" />
            <p className="text-sm font-bold text-warning-foreground">
              R$ {brl(caixa.aberto)} ainda a receber em {caixa.contasAbertas}{" "}
              {caixa.contasAbertas === 1 ? "conta aberta" : "contas abertas"} — receba antes de
              fechar o dia.
            </p>
            <Link
              to="/vendas"
              className="ml-auto shrink-0 rounded-lg border border-warning px-3 py-1.5 text-xs font-black uppercase tracking-wide text-warning-foreground"
            >
              Ver contas
            </Link>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* 2º nível: de onde veio o dinheiro. */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-1.5 font-display text-xl tracking-wide">
              Como o dinheiro entrou
              <Dica texto="Soma recebida em cada forma de pagamento no período. A barra mostra o peso de cada uma — útil para conferir a maquininha e o extrato do PIX." />
            </h2>
            <ul className="mt-4 grid gap-3">
              {formas.map((f) => {
                const v = caixa?.formas?.[f.chave] ?? 0;
                const fatia = entradas ? Math.round((v / entradas) * 100) : 0;
                return (
                  <li key={f.chave}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        <f.icone className="size-4 text-muted-foreground" />
                        {f.rotulo}
                      </span>
                      <span className="money text-lg tabular-nums">
                        R$ {brl(v)}
                        <span className="ml-2 text-xs font-bold text-muted-foreground">
                          {fatia}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", f.cor)}
                        style={{ width: `${(v / maiorForma) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {porCategoria.length ? (
              <>
                <h3 className="mt-6 flex items-center gap-1.5 font-display text-lg tracking-wide text-danger">
                  Para onde saiu
                  <Dica texto="Total lançado em Saídas por categoria. Lançamentos sem categoria aparecem como 'Sem categoria'." />
                </h3>
                <ul className="mt-3 grid gap-2">
                  {porCategoria.map(([c, v]) => (
                    <li
                      key={c}
                      className="flex items-center justify-between rounded-xl bg-danger-soft px-3 py-2"
                    >
                      <span className="text-sm font-bold text-danger">{c}</span>
                      <span className="money text-base tabular-nums text-danger">R$ {brl(v)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          {/* 3º nível: a tarefa física — conferir a gaveta. */}
          <section className="h-fit rounded-2xl border-2 border-dashed border-border bg-card p-5">
            <h2 className="flex items-center gap-1.5 font-display text-xl tracking-wide">
              <Wallet className="size-5 text-muted-foreground" />
              Conferir a gaveta
              <Dica texto="Saldo que sobrou dos dias anteriores + vendas em dinheiro + entradas de gaveta − saídas em dinheiro. Saída paga no PIX ou no cartão não tira cédula da gaveta. Conte e digite abaixo: o sistema diz se falta ou sobra." />
            </h2>

            <p className="eyebrow mt-4 text-muted-foreground">Deve ter na gaveta</p>

            <p
              key={pulso}
              className={cn(
                "money text-4xl leading-none tabular-nums",
                pulso ? "sale-sweep" : "",
                gaveta < 0 ? "text-danger" : "",
              )}
            >
              R$ {brl(gavetaAnimada)}
            </p>

            <button
              type="button"
              onClick={() => setModal(true)}
              className="press mt-3 text-sm font-black uppercase tracking-wide text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
            >
              Ajustar gaveta
            </button>


            {ajustes.length ? (
              <ul className="mt-3 grid gap-1.5">
                {ajustes.map((a) => (
                  <li
                    key={a.id}
                    className="flash-in flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2"
                  >
                    {a.kind === "entrada" ? (
                      <ArrowDownLeft className="size-4 shrink-0 text-success" />
                    ) : (
                      <ArrowUpRight className="size-4 shrink-0 text-danger" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs font-bold">
                      {a.note || (a.kind === "entrada" ? "Entrada" : "Saída")}
                      <span className="ml-1 font-normal text-muted-foreground">
                        {new Date(a.occurred_at).toLocaleTimeString("pt-BR", {
                          timeStyle: "short",
                        })}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "money shrink-0 text-sm tabular-nums",
                        a.kind === "entrada" ? "text-success" : "text-danger",
                      )}
                    >
                      {a.kind === "entrada" ? "+" : "−"} R$ {brl(a.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => desfazer.mutate(a.id)}
                      disabled={desfazer.isPending}
                      aria-label="Desfazer lançamento"
                      className="press grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-danger"
                    >
                      <Undo2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}


            <label className="mt-4 block text-xs font-black uppercase tracking-wide text-muted-foreground">
              Contei na gaveta
              <input
                inputMode="decimal"
                value={contado}
                onChange={(e) => setContado(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0,00"
                className="money mt-1 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-2xl tabular-nums text-foreground outline-none focus:border-primary"
              />
            </label>

            {diferenca !== null ? (
              <div
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold",
                  diferenca === 0
                    ? "bg-success-soft text-success"
                    : diferenca < 0
                      ? "bg-danger-soft text-danger"
                      : "bg-warning-soft text-warning-foreground",
                )}
              >
                {diferenca === 0 ? (
                  <>
                    <CheckCircle2 className="size-5 shrink-0" />
                    Bateu certinho — pode fechar.
                  </>
                ) : (
                  <>
                    <TriangleAlert className="size-5 shrink-0" />
                    {diferenca < 0 ? "Falta" : "Sobra"} R$ {brl(Math.abs(diferenca))} na gaveta.
                  </>
                )}
              </div>
            ) : null}

            <Link
              to="/saidas"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-danger hover:text-danger"
            >
              <ReceiptText className="size-4" />
              Lançar ou ver saídas
            </Link>
          </section>
        </div>
      </div>

      {modal ? (
        <ModalGaveta
          gavetaAtual={gaveta}
          salvando={lancar.isPending}
          onFechar={() => setModal(false)}
          onConfirmar={(dados) => lancar.mutate(dados)}
        />
      ) : null}
      </TravaSecao>

    </AppShell>
  );
}
