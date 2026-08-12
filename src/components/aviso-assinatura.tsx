import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CreditCard, Lock } from "lucide-react";
import { linkCheckout, minhaAssinatura } from "@/lib/assinatura.functions";
import { CARENCIA_DIAS } from "@/lib/assinatura";
import { cn } from "@/lib/utils";

/**
 * Aviso da assinatura. Perder acesso no meio do movimento é o pior cenário,
 * então o sistema avisa antes e com data: "faltam X dias". Nos primeiros
 * dias dá para fechar e vender; do 5º em diante o aviso trava a atenção;
 * passados 7 dias a tela vira só regularização.
 *
 * A dispensa vale por DIA, não por sessão: antes, quem fechava uma vez não
 * voltava a ver o aviso enquanto o prazo corria — o pior jeito de avisar.
 */
export function AvisoAssinatura() {
  const ler = useServerFn(minhaAssinatura);
  const lerLink = useServerFn(linkCheckout);
  const [dispensado, setDispensado] = useState(false);

  const assinatura = useQuery({
    queryKey: ["assinatura"],
    queryFn: () => ler(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const checkout = useQuery({
    queryKey: ["checkout-url"],
    queryFn: () => lerLink(),
    staleTime: Infinity,
    retry: false,
  });

  const hoje = new Date().toISOString().slice(0, 10);

  /* Um aviso por dia enquanto ainda dá para trabalhar. */
  useEffect(() => {
    try {
      if (localStorage.getItem("aviso-assinatura") === hoje) setDispensado(true);
    } catch {
      /* navegador sem armazenamento: avisa sempre, e melhor assim */
    }
  }, [hoje]);

  const a = assinatura.data;
  if (!a || a.emDia) return null;

  const url = checkout.data?.url ?? "";
  const insistente = a.atraso >= 5;

  if (a.bloqueado) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-background p-5">
        <div className="w-full max-w-md rounded-3xl border-2 border-danger/40 bg-card p-6 text-center shadow-2xl">
          <Lock className="mx-auto size-10 text-danger" />
          <h2 className="mt-3 font-display text-3xl tracking-wide">Acesso bloqueado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O pagamento está atrasado há {a.atraso} dias. Seus dados continuam guardados: assim
            que o pagamento for aprovado, tudo volta exatamente como estava.
          </p>
          <BotaoPagar url={url} />
        </div>
      </div>
    );
  }

  if (dispensado && !insistente) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/45 p-5">
      <div
        className={cn(
          "modal-in w-full max-w-md rounded-3xl border-2 bg-card p-6 text-center shadow-2xl",
          insistente ? "border-danger/50" : "border-warning/50",
        )}
      >
        <AlertTriangle
          className={cn("mx-auto size-10", insistente ? "text-danger" : "text-warning")}
        />
        <h2 className="mt-3 font-display text-3xl tracking-wide">
          Pagamento atrasado há {a.atraso} {a.atraso === 1 ? "dia" : "dias"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Faltam <b className="text-foreground">{a.restam}</b>{" "}
          {a.restam === 1 ? "dia" : "dias"} para o acesso ser bloqueado. Regularize agora e nem
          perceba a diferença.
        </p>

        <div className="mt-4 flex gap-1" aria-hidden>
          {Array.from({ length: CARENCIA_DIAS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < a.atraso ? (insistente ? "bg-danger" : "bg-warning") : "bg-border",
              )}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {a.restam} de {CARENCIA_DIAS} dias de tolerância restando
        </p>

        <BotaoPagar url={url} />
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem("aviso-assinatura", hoje);
            } catch {
              /* sem armazenamento: volta a avisar na próxima tela */
            }
            setDispensado(true);
          }}
          className="press mt-2 h-12 w-full rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          {insistente ? "Continuar mesmo assim" : "Agora não"}
        </button>
      </div>
    </div>
  );
}

function BotaoPagar({ url }: { url: string }) {
  return (
    <a
      href={url || "#"}
      target={url ? "_blank" : undefined}
      rel="noreferrer"
      className="press glow-primary mt-4 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-display text-2xl tracking-wider text-primary-foreground"
    >
      <CreditCard className="size-6" />
      Pagar R$ 39,90
    </a>
  );
}
