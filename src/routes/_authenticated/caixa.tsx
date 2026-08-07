import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  CreditCard,
  QrCode,
  ReceiptText,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useContagem } from "@/components/pdv/comum";
import { SeletorPeriodo } from "@/components/periodo/seletor-periodo";
import { brl } from "@/lib/config";
import { intervaloPreset, rotuloIntervalo, type Intervalo } from "@/lib/relatorios";
import { listarSaidas } from "@/lib/saidas.functions";
import { resumoCaixa } from "@/lib/vendas.functions";
import { cn } from "@/lib/utils";
import { AvisoErro } from "@/components/aviso-erro";

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
  { chave: "cash", rotulo: "Dinheiro", icone: Banknote },
  { chave: "pix", rotulo: "PIX", icone: QrCode },
  { chave: "debit", rotulo: "Débito", icone: CreditCard },
  { chave: "credit", rotulo: "Crédito", icone: CreditCard },
] as const;

function CaixaPage() {
  const [periodo, setPeriodo] = useState<Intervalo>(() => intervaloPreset("hoje"));

  const buscarCaixa = useServerFn(resumoCaixa);
  const buscarSaidas = useServerFn(listarSaidas);

  const caixaQuery = useQuery({
    queryKey: ["caixa", periodo.de, periodo.ate],
    queryFn: () => buscarCaixa({ data: { de: periodo.de, ate: periodo.ate } }),
  });
  const saidasQuery = useQuery({
    queryKey: ["saidas", periodo.de, periodo.ate],
    queryFn: () => buscarSaidas({ data: { de: periodo.de, ate: periodo.ate } }),
  });

  const caixa = caixaQuery.data;
  const saidas = saidasQuery.data ?? [];

  const totalSaidas = caixa?.saidas ?? 0;
  const liquido = caixa?.liquido ?? 0;
  const totalAnimado = useContagem(totalSaidas);
  const liquidoAnimado = useContagem(liquido);
  const gavetaAnimada = useContagem(caixa?.gaveta ?? 0);

  return (
    <AppShell>
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

        {caixa && caixa.contasAbertas > 0 ? (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-warning bg-warning-soft px-4 py-3">
            <TriangleAlert className="size-5 shrink-0 text-warning-foreground" />
            <p className="text-sm font-bold text-warning-foreground">
              R$ {brl(caixa.aberto)} ainda a receber em {caixa.contasAbertas}{" "}
              {caixa.contasAbertas === 1 ? "conta aberta" : "contas abertas"} — receba antes de
              fechar o dia.
            </p>
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl tracking-wide">
            Fechamento · {rotuloIntervalo(periodo).toLowerCase()}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-success-soft p-4">
              <p className="eyebrow text-success">Entrou</p>
              <p className="money mt-1 text-3xl leading-none text-success">
                R$ {brl(caixa?.entradas ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {caixa?.vendas ?? 0} {caixa?.vendas === 1 ? "venda" : "vendas"}
                {caixa && caixa.descontos > 0 ? ` · R$ ${brl(caixa.descontos)} de desconto` : ""}
              </p>
            </div>
            <div className="rounded-xl bg-danger-soft p-4">
              <p className="eyebrow text-danger">Saiu</p>
              <p className="money mt-1 text-3xl leading-none text-danger">R$ {brl(totalAnimado)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {saidas.length} {saidas.length === 1 ? "lançamento" : "lançamentos"}
              </p>
            </div>
            <div className={cn("rounded-xl p-4", liquido < 0 ? "bg-danger-soft" : "bg-secondary")}>
              <p className="eyebrow text-muted-foreground">Sobrou</p>
              <p
                className={cn(
                  "money mt-1 text-3xl leading-none",
                  liquido < 0 ? "text-danger" : "text-foreground",
                )}
              >
                R$ {brl(liquidoAnimado)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">entradas menos saídas</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {formas.map((f) => (
              <div key={f.chave} className="rounded-xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-[0.6875rem] font-black uppercase tracking-wide text-muted-foreground">
                  <f.icone className="size-3.5" />
                  {f.rotulo}
                </p>
                <p className="money mt-1 text-xl leading-none">
                  R$ {brl(caixa?.formas?.[f.chave] ?? 0)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4">
            <Wallet className="size-6 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="eyebrow text-muted-foreground">Deve ter na gaveta</p>
              <p className="money text-3xl leading-none">R$ {brl(gavetaAnimada)}</p>
            </div>
            <p className="ml-auto max-w-[12rem] text-right text-xs leading-snug text-muted-foreground">
              Vendas em dinheiro menos as retiradas. Confira a gaveta física com esse número.
            </p>
          </div>
        </section>

        <Link
          to="/saidas"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-danger hover:text-danger"
        >
          <ReceiptText className="size-4" />
          Ver as saídas do dia
        </Link>
      </div>
    </AppShell>
  );
}
