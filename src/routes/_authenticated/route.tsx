import { useEffect, useRef } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AvisoAssinatura } from "@/components/aviso-assinatura";
import { sincronizarConta } from "@/lib/assinatura.functions";
import { useSincronizarConfig } from "@/lib/use-config-sync";

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
  const queryClient = useQueryClient();
  const feito = useRef(false);

  /* Primeiro acesso do dia: termina o cadastro vindo da landing e resgata
     pagamentos que chegaram antes da conta existir. Silencioso de propósito —
     se der erro, a loja continua funcionando. */
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    sincronizar()
      .then((r) => {
        if (r?.aplicado) void queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      })
      .catch(() => {});
  }, [sincronizar, queryClient]);

  return (
    <>
      <Outlet />
      <AvisoAssinatura />
    </>
  );
}


