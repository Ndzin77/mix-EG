import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BadgeCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import { minhaAssinatura } from "@/lib/assinatura.functions";
import { diasAteVencer } from "@/lib/assinatura";
import { cn } from "@/lib/utils";

/**
 * Atalho no Admin. O detalhe todo vive na tela de Assinatura — aqui só a cor
 * e uma frase, para a dona saber em um relance se precisa ir lá.
 */
export function CartaoAssinatura() {
  const ler = useServerFn(minhaAssinatura);
  const { data: a, isLoading } = useQuery({
    queryKey: ["assinatura"],
    queryFn: () => ler(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const emDia = a?.emDia ?? false;
  const faltam = a ? diasAteVencer(a.venceEm) : 0;
  const atencao = emDia && faltam <= 3;

  return (
    <Link
      to="/assinatura"
      className={cn(
        "press block rounded-2xl border-2 p-5 transition-colors",
        !a
          ? "border-border bg-card"
          : !emDia
            ? "border-danger/50 bg-danger/10"
            : atencao
              ? "border-warning/50 bg-warning/10"
              : "border-success/50 bg-success-soft",
      )}
    >
      <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <BadgeCheck className="size-4" />
        Assinatura e cobrança
      </span>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-display text-2xl leading-none tracking-wide">
          {isLoading ? null : emDia ? (
            <CheckCircle2 className={cn("size-6", atencao ? "text-warning" : "text-success")} />
          ) : (
            <ShieldAlert className="size-6 animate-pulse text-danger" />
          )}
          {isLoading
            ? "Conferindo…"
            : !a
              ? "—"
              : a.bloqueado
                ? "Acesso bloqueado"
                : emDia
                  ? atencao
                    ? `Vence em ${faltam} ${faltam === 1 ? "dia" : "dias"}`
                    : "Assinatura em dia"
                  : `Atrasada há ${a.atraso} ${a.atraso === 1 ? "dia" : "dias"}`}
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Abrir a tela de assinatura: plano, próxima cobrança, pagamento e ligação com a Kirvano.
      </p>
    </Link>
  );
}
