import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { AvisoErro } from "@/components/aviso-erro";
import { TravaSecao } from "@/components/trava-secao";
import gestorPro from "@/assets/gestor-pro.png.asset.json";
import {
  eventosKirvano,
  linkCheckout,
  minhaAssinatura,
  sincronizarConta,
} from "@/lib/assinatura.functions";

import {
  CARENCIA_DIAS,
  diasAteVencer,
  rotuloEvento,
  rotuloPlano,
  sufixoPreco,
  type EstadoAssinatura,
} from "@/lib/assinatura";
import { brl, useConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Onde o cliente vê a própria cobrança: painel do comprador da Kirvano. */
const PAINEL_COBRANCA = "https://app.kirvano.com";


export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura — próxima cobrança e acesso | Gestor Pro" },
      {
        name: "description",
        content:
          "Veja quantos dias faltam para a próxima cobrança, o valor do plano e regularize em um toque.",
      },
      { property: "og:title", content: "Assinatura — próxima cobrança e acesso | Gestor Pro" },
      {
        property: "og:description",
        content: "Quantos dias faltam para renovar, o valor do plano e o pagamento em um toque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaAssinatura,
});

function PaginaAssinatura() {
  return (
    <AppShell>
      <PageHeader title="Assinatura" subtitle="Seu acesso ao sistema, em uma tela" />
      <TravaSecao secao="assinatura" titulo="Assinatura">
        <Conteudo />
      </TravaSecao>
    </AppShell>
  );
}

function Conteudo() {
  const [config] = useConfig();
  const ler = useServerFn(minhaAssinatura);
  const lerLink = useServerFn(linkCheckout);
  const sincronizar = useServerFn(sincronizarConta);
  const queryClient = useQueryClient();
  const [conferindo, setConferindo] = useState(false);

  const assinatura = useQuery({ queryKey: ["assinatura"], queryFn: () => ler(), retry: false });
  const checkout = useQuery({
    queryKey: ["checkout-url"],
    queryFn: () => lerLink(),
    staleTime: Infinity,
    retry: false,
  });

  /* Pagou e a tela não mudou? Em vez de esperar sem saber, a pessoa confere
     na hora — controle percebido derruba a ansiedade e o pedido de suporte. */
  async function conferir() {
    if (conferindo) return;
    setConferindo(true);
    try {
      const r = await sincronizar();
      await queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      toast[r?.aplicado ? "success" : "info"](
        r?.aplicado ? "Pagamento encontrado! Acesso liberado." : "Nenhum pagamento novo por aqui.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui conferir agora.");
    } finally {
      setConferindo(false);
    }
  }

  if (assinatura.isError) {
    return (
      <div className="p-5">
        <AvisoErro erro={assinatura.error} aoTentar={() => void assinatura.refetch()} />
      </div>
    );
  }

  const a = assinatura.data;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
      <div className="animate-fade-in mx-auto grid max-w-3xl gap-5">
        {/* A marca do sistema abre a tela: quem cobra tem cara e nome. */}
        <div className="logo-chega flex flex-col items-center gap-1">
          <img
            src={gestorPro.url}
            alt="Gestor Pro"
            className="h-20 w-auto object-contain mix-blend-multiply md:h-24"
          />
          <span className="eyebrow text-muted-foreground">Sua assinatura do Gestor Pro</span>
        </div>

        <Anel estado={a} carregando={assinatura.isLoading} loja={config.nomeLoja} />
        <Plano estado={a} url={checkout.data?.url ?? ""} />
        <Button
          type="button"
          variant="outline"
          onClick={() => void conferir()}
          disabled={conferindo}
          className="press mx-auto h-12 rounded-xl px-5 text-sm font-bold"
        >
          <RefreshCw className={cn("size-4", conferindo && "animate-spin")} />
          {conferindo ? "Conferindo…" : "Já paguei — conferir agora"}
        </Button>
        <Historico />
      </div>
    </div>
  );
}

/**
 * Histórico simples: só o que o cliente entende — "pagamento aprovado" e
 * quando chegou. Nada de webhook, token ou nome de evento cru.
 */
function Historico() {
  const ler = useServerFn(eventosKirvano);
  const dados = useQuery({
    queryKey: ["kirvano-eventos"],
    queryFn: () => ler(),
    retry: false,
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Receipt className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 text-sm font-bold">Pagamentos recebidos</h2>
      </div>

      <div className="p-5">
        {dados.isLoading ? (
          <p className="text-sm text-muted-foreground">Conferindo…</p>
        ) : dados.data?.eventos.length ? (
          <ul className="grid gap-1.5">
            {dados.data.eventos.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate font-bold">{rotuloEvento(e.evento)}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {new Date(e.quando).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum pagamento registrado por aqui ainda.
          </p>
        )}
      </div>
    </section>
  );
}





/**
 * Anel de renovação. Forma fechada é lida como controle, não como ameaça:
 * o círculo se esvazia até a data e só vira alarme quando atrasa de verdade.
 */
function Anel({
  estado,
  carregando,
  loja,
}: {
  estado: EstadoAssinatura | undefined;
  carregando: boolean;
  loja: string;
}) {
  const emDia = estado?.emDia ?? false;
  const faltam = estado ? diasAteVencer(estado.venceEm) : 0;
  const atencao = emDia && faltam <= 3;

  /* O anel usa o ciclo do plano da pessoa: no anual não fica vazio o ano todo. */
  const ciclo = estado?.cicloDias ?? 30;
  const fracao = emDia ? Math.min(1, Math.max(0.02, faltam / ciclo)) : 0;
  const raio = 78;
  const volta = 2 * Math.PI * raio;

  const cor = !estado
    ? "text-muted-foreground"
    : !emDia
      ? "text-danger"
      : atencao
        ? "text-warning"
        : "text-success";

  const fundo = !estado
    ? "border-border bg-card"
    : !emDia
      ? "border-danger/40 bg-danger/8"
      : atencao
        ? "border-warning/40 bg-warning/8"
        : "border-success/40 bg-success-soft";

  const dataLonga = estado
    ? new Date(estado.venceEm).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
    : "—";

  return (
    <section className={cn("rounded-2xl border-2 p-6 text-center", fundo)}>
      <span className="eyebrow text-muted-foreground">{loja || "Sua loja"}</span>

      <div className="relative mx-auto mt-4 grid size-48 place-items-center">
        <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle cx="100" cy="100" r={raio} className="stroke-border" strokeWidth="12" fill="none" />
          <circle
            cx="100"
            cy="100"
            r={raio}
            className={cn("transition-[stroke-dashoffset] duration-700", cor)}
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={volta}
            strokeDashoffset={volta * (1 - fracao)}
          />
        </svg>

        <div className="relative">
          {carregando ? (
            <span className="font-display text-2xl tracking-wide text-muted-foreground">
              Conferindo…
            </span>
          ) : emDia ? (
            <>
              <span className="money block text-6xl font-black leading-none tabular-nums">
                {faltam}
              </span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {faltam === 1 ? "dia" : "dias"} para renovar
              </span>
            </>
          ) : (
            <>
              <span className="money block text-6xl font-black leading-none tabular-nums text-danger">
                {estado?.atraso ?? 0}
              </span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-wider text-danger">
                {estado?.atraso === 1 ? "dia de atraso" : "dias de atraso"}
              </span>
            </>
          )}
        </div>
      </div>

      <h2 className="mt-4 flex items-center justify-center gap-2 font-display text-3xl leading-none tracking-wide">
        {carregando ? null : emDia ? (
          <CheckCircle2 className={cn("size-7", atencao ? "text-warning" : "text-success")} />
        ) : (
          <ShieldAlert className="size-7 animate-pulse text-danger" />
        )}
        {carregando
          ? " "
          : !estado
            ? "—"
            : estado.bloqueado
              ? "Acesso bloqueado"
              : emDia
                ? atencao
                  ? "Renova em breve"
                  : "Assinatura em dia"
                : "Pagamento atrasado"}
      </h2>

      {estado ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {emDia ? (
            <>
              Renova em <b className="text-foreground">{dataLonga}</b> — automático, você não
              precisa fazer nada.
            </>
          ) : (
            <>
              Faltam <b className="text-foreground">{estado.restam}</b>{" "}
              {estado.restam === 1 ? "dia" : "dias"} para o acesso fechar. Seus dados continuam
              guardados de qualquer forma.
            </>
          )}
        </p>
      ) : null}

      {/* Tolerância só aparece quando existe perda real a evitar. */}
      {estado && !emDia ? (
        <div className="mx-auto mt-4 max-w-xs">
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: CARENCIA_DIAS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2.5 flex-1 rounded-full transition-colors",
                  i < estado.atraso ? "bg-danger" : "bg-border",
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {estado.atraso} de {CARENCIA_DIAS} dias de tolerância
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** Plano e pagamento: um valor, um botão. */
function Plano({ estado, url }: { estado: EstadoAssinatura | undefined; url: string }) {
  const emDia = estado?.emDia ?? false;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <span className="eyebrow text-muted-foreground">
            Plano {rotuloPlano(estado?.plano)} · sem fidelidade
          </span>
          <p className="money mt-1 text-4xl font-black leading-none">
            R$ {brl(estado?.valor ?? 39.9)}
            <span className="ml-1 text-sm font-bold text-muted-foreground">
              {sufixoPreco(estado?.plano)}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
            emDia ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
          )}
        >
          {emDia ? "Ativa" : "Regularizar"}
        </span>
      </div>

      {/* Em dia: o cliente quer o painel dele (notas, cartão) — não o checkout. */}
      <a
        href={emDia ? PAINEL_COBRANCA : url || "#"}
        target={emDia || url ? "_blank" : undefined}
        rel="noreferrer"
        className={cn(
          "press mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-2xl font-display text-2xl tracking-wider",
          emDia
            ? "border-2 border-border text-foreground hover:border-primary"
            : "glow-primary bg-primary text-primary-foreground",
        )}
      >
        <CreditCard className="size-6" />
        {emDia ? "Ver minha cobrança" : "Pagar agora"}
      </a>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        {emDia ? (
          <>
            <Sparkles className="size-3.5 text-success" />
            O recibo de cada cobrança chega no seu e-mail
          </>
        ) : (
          <>
            <ShieldCheck className="size-3.5 text-success" />
            Pagamento confirmado libera o acesso na hora
          </>
        )}
      </p>
    </section>
  );
}
