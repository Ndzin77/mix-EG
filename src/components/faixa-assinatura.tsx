import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CreditCard } from "lucide-react";
import { linkCheckout, minhaAssinatura } from "@/lib/assinatura.functions";
import { CARENCIA_DIAS, diasAteVencer } from "@/lib/assinatura";
import { cn } from "@/lib/utils";

/**
 * Faixa fixa do acesso. Diferente do modal, esta não se dispensa: enquanto
 * o pagamento está atrasado ela fica à vista com a contagem do que ainda
 * resta — perda concreta ("faltam 6 dias") pesa mais que ameaça vaga.
 * Nos três dias finais do ciclo aparece em tom calmo, só antecipando.
 */
export function FaixaAssinatura() {
  const ler = useServerFn(minhaAssinatura);
  const lerLink = useServerFn(linkCheckout);

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

  const a = assinatura.data;
  if (!a || !a.pago || a.bloqueado) return null;

  const faltam = diasAteVencer(a.venceEm);
  const atrasada = !a.emDia;
  const perto = a.emDia && faltam <= 3;
  if (!atrasada && !perto) return null;

  const url = checkout.data?.url ?? "";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 px-3 py-2 text-sm md:px-5",
        atrasada
          ? "bg-danger text-primary-foreground"
          : "bg-warning/20 text-foreground border-b border-warning/40",
      )}
    >
      {atrasada ? (
        <AlertTriangle className="size-5 shrink-0" />
      ) : (
        <CalendarClock className="size-5 shrink-0 text-warning" />
      )}

      <p className="min-w-0 flex-1 font-bold leading-tight">
        {atrasada ? (
          <>
            Pagamento atrasado há {a.atraso} {a.atraso === 1 ? "dia" : "dias"} —{" "}
            <span className="underline decoration-2">
              faltam {a.restam} {a.restam === 1 ? "dia" : "dias"} de acesso
            </span>
          </>
        ) : (
          <>
            Renova em {faltam} {faltam === 1 ? "dia" : "dias"}. Tudo certo — pode adiantar se
            quiser.
          </>
        )}
      </p>

      {/* Barra de tolerância: sete quadradinhos que vão apagando. */}
      {atrasada ? (
        <span className="hidden w-28 gap-0.5 sm:flex" aria-hidden>
          {Array.from({ length: CARENCIA_DIAS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < a.atraso ? "bg-primary-foreground/30" : "bg-primary-foreground",
              )}
            />
          ))}
        </span>
      ) : null}

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "press flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 font-display text-lg tracking-wide",
            atrasada ? "bg-card text-danger" : "bg-warning text-warning-foreground",
          )}
        >
          <CreditCard className="size-4" />
          Pagar
        </a>
      ) : (
        <Link
          to="/assinatura"
          className="press h-9 shrink-0 rounded-lg bg-card px-3 font-bold leading-9 text-foreground"
        >
          Ver
        </Link>
      )}
    </div>
  );
}
