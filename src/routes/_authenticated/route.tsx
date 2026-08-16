import { useEffect, useRef, useState } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AvisoAssinatura } from "@/components/aviso-assinatura";
import { sincronizarConta } from "@/lib/assinatura.functions";
import { useSincronizarConfig } from "@/lib/use-config-sync";
import { minhaAssinatura } from "@/lib/assinatura.functions";
import { AtivarAssinatura } from "@/components/ativar-assinatura";

const CHAVE_LIBERADO = "egmix.acesso.liberado";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    /* Sem internet o servidor de login não responde: vale a sessão que já
       está guardada no aparelho, senão o caixa fica trancado fora do ar. */
    const semRede = typeof navigator !== "undefined" && !navigator.onLine;
    if (semRede) {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) throw redirect({ to: "/auth" });
      return { user: data.session.user };
    }
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return { user: data.user };
    const { data: local } = await supabase.auth.getSession();
    if (local.session?.user) return { user: local.session.user };
    throw redirect({ to: "/auth" });
  },
  component: LayoutAutenticado,
});


/** As preferências da loja valem em todas as telas — não só em Vendas.
 *  Sem isso, mexer em categoria no Admin gravava só no navegador. */
function LayoutAutenticado() {
  useSincronizarConfig();
  const sincronizar = useServerFn(sincronizarConta);
  const lerAssinatura = useServerFn(minhaAssinatura);
  const queryClient = useQueryClient();
  const feito = useRef(false);
  /* Quem já entrou pagando abre direto, mesmo sem sinal: a conferência de
     assinatura acontece ao fundo assim que a internet responder. */
  const liberadoAntes =
    typeof localStorage !== "undefined" && localStorage.getItem(CHAVE_LIBERADO) === "1";
  const [estado, setEstado] = useState<"carregando" | "liberado" | "pendente">(
    liberadoAntes ? "liberado" : "carregando",
  );

  /* Primeiro acesso do dia: termina o cadastro vindo da landing e resgata
     pagamentos que chegaram antes da conta existir. Silencioso de propósito —
     se der erro, a loja continua funcionando. */
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setEstado(liberadoAntes ? "liberado" : "pendente");
      return;
    }
    sincronizar()
      .then(async (r) => {
        if (r?.aplicado) await queryClient.invalidateQueries({ queryKey: ["assinatura"] });
        const assinatura = await lerAssinatura();
        queryClient.setQueryData(["assinatura"], assinatura);
        localStorage.setItem(CHAVE_LIBERADO, assinatura.pago ? "1" : "0");
        setEstado(assinatura.pago ? "liberado" : "pendente");
      })
      .catch(() => setEstado(liberadoAntes ? "liberado" : "pendente"));
  }, [sincronizar, lerAssinatura, queryClient, liberadoAntes]);


  if (estado === "carregando") {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <p className="font-display text-2xl tracking-wide text-muted-foreground">Conferindo seu acesso…</p>
      </main>
    );
  }

  if (estado === "pendente") return <AtivarAssinatura />;

  return (
    <>
      <Outlet />
      <AvisoAssinatura />
    </>
  );
}


