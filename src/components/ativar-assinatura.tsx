import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CreditCard, Loader2, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { linkCheckout, sincronizarConta } from "@/lib/assinatura.functions";
import { cn } from "@/lib/utils";

/** Única tela disponível antes do primeiro pagamento confirmado. */
export function AtivarAssinatura() {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const buscarLink = useServerFn(linkCheckout);
  const sincronizar = useServerFn(sincronizarConta);
  const [conferindo, setConferindo] = useState(false);
  const checkout = useQuery({
    queryKey: ["checkout-url"],
    queryFn: () => buscarLink(),
    staleTime: Infinity,
    retry: false,
  });

  async function conferir() {
    if (conferindo) return;
    setConferindo(true);
    try {
      const resultado = await sincronizar();
      await queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      if (resultado.aplicado) {
        toast.success("Pagamento confirmado — acesso liberado.");
        navegar({ to: "/vendas", replace: true });
      } else {
        toast.info("Ainda não recebemos a confirmação da Kirvano.");
      }
    } catch {
      toast.error("Não foi possível conferir agora. Tente novamente em instantes.");
    } finally {
      setConferindo(false);
    }
  }

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navegar({ to: "/auth", replace: true });
  }

  const url = checkout.data?.url ?? "";
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-warning/40 bg-warning-soft px-6 py-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-warning text-warning-foreground">
            <CreditCard className="size-6" />
          </span>
          <h1 className="mt-3 font-display text-3xl tracking-wide">Aguardando pagamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua loja está criada. O sistema abre assim que a Kirvano confirmar o pagamento.
          </p>
        </div>

        <div className="p-6">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="eyebrow text-muted-foreground">Plano mensal</p>
              <p className="money mt-1 text-4xl font-black">R$ 39,90</p>
            </div>
            <span className="rounded-full bg-warning/15 px-3 py-1.5 text-xs font-bold text-warning-foreground">
              Não ativado
            </span>
          </div>

          <ul className="my-5 grid gap-2 text-sm font-bold">
            <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Renovação mensal</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /> Liberação somente após confirmação</li>
          </ul>

          <Button asChild className="h-14 w-full rounded-xl text-lg font-bold shadow-lg">
            <a href={url || "#"} target={url ? "_blank" : undefined} rel="noreferrer">
              <CreditCard /> Ir para o pagamento
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void conferir()}
            disabled={conferindo}
            className="mt-3 h-12 w-full rounded-xl font-bold"
          >
            {conferindo ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {conferindo ? "Conferindo…" : "Já paguei — conferir agora"}
          </Button>
          <button
            type="button"
            onClick={() => void sair()}
            className={cn("mx-auto mt-5 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground")}
          >
            <LogOut className="size-4" /> Sair desta conta
          </button>
        </div>
      </section>
    </main>
  );
}