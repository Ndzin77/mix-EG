import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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
  return <Outlet />;
}

