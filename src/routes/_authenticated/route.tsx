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

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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
  const [estado, setEstado] = useState<"carregando" | "liberado" | "pendente">("carregando");

  /* Primeiro acesso do dia: termina o cadastro vindo da landing e resgata
     pagamentos que chegaram antes da conta existir. Silencioso de propósito —
     se der erro, a loja continua funcionando. */
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    sincronizar()
      .then(async (r) => {
        if (r?.aplicado) await queryClient.invalidateQueries({ queryKey: ["assinatura"] });
        const assinatura = await lerAssinatura();
        queryClient.setQueryData(["assinatura"], assinatura);
        setEstado(assinatura.pago ? "liberado" : "pendente");
      })
      .catch(() => setEstado("pendente"));
  }, [sincronizar, lerAssinatura, queryClient]);

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


