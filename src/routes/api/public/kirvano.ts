import { createFileRoute } from "@tanstack/react-router";

/**
 * Recebimento automático da Kirvano. É a única porta que grava assinatura:
 * o aplicativo só lê. Cada loja é achada pelo e-mail do comprador, então
 * multi-loja continua separado.
 */

type Corpo = {
  event?: string;
  status?: string;
  customer?: { email?: string; name?: string; phone?: string };
  subscription?: { id?: string; next_charge_date?: string; charge_date?: string };
  sale_id?: string;
  checkout_id?: string;
};

const ATIVA = ["SALE_APPROVED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_APPROVED"];
const CANCELA = [
  "SALE_REFUNDED",
  "SALE_CHARGEBACK",
  "SUBSCRIPTION_CANCELED",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_EXPIRED",
];
const ATRASA = ["SUBSCRIPTION_LATE", "SALE_REFUSED", "ABANDONED_CART"];

const trintaDias = () => new Date(Date.now() + 31 * 86_400_000).toISOString();

export const Route = createFileRoute("/api/public/kirvano")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const esperado = process.env["KIRVANO_WEBHOOK_TOKEN"];
        const enviado =
          request.headers.get("security-token") ?? request.headers.get("x-kirvano-token") ?? "";
        if (!esperado || enviado !== esperado) {
          return new Response("Invalid token", { status: 401 });
        }

        let corpo: Corpo;
        try {
          corpo = (await request.json()) as Corpo;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const email = corpo.customer?.email?.trim().toLowerCase();
        const evento = (corpo.event ?? corpo.status ?? "").toUpperCase();
        if (!email) return new Response("Missing customer email", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        /* A loja é a do dono que comprou: casamos pelo e-mail do perfil. */
        const { data: perfil } = await supabaseAdmin
          .from("profiles")
          .select("tenant_id")
          .ilike("email", email)
          .maybeSingle();

        const tenant =
          perfil?.tenant_id ??
          (
            await supabaseAdmin
              .from("subscriptions")
              .select("tenant_id")
              .ilike("buyer_email", email)
              .maybeSingle()
          ).data?.tenant_id;

        if (!tenant) {
          /* Pagou antes da conta existir: guardamos o evento e respondemos ok
             para a Kirvano não reenviar em laço. */
          return Response.json({ ok: true, pendente: "conta ainda não criada" });
        }

        const status = ATIVA.includes(evento)
          ? "active"
          : CANCELA.includes(evento)
            ? "canceled"
            : ATRASA.includes(evento)
              ? "past_due"
              : null;
        if (!status) return Response.json({ ok: true, ignorado: evento });

        /* Reenvio da Kirvano não pode "desligar" quem já está pago em dia:
           só marcamos atraso quando o período realmente venceu. */
        if (status === "past_due") {
          const { data: atual } = await supabaseAdmin
            .from("subscriptions")
            .select("current_period_end")
            .eq("tenant_id", tenant)
            .maybeSingle();
          const fim = atual?.current_period_end as string | undefined;
          if (fim && new Date(fim).getTime() > Date.now()) {
            return Response.json({ ok: true, ignorado: "ainda dentro do período pago" });
          }
        }

        const patch: Record<string, unknown> = {
          tenant_id: tenant,
          status,
          buyer_email: email,
          last_event: evento,
          updated_at: new Date().toISOString(),
        };
        if (corpo.subscription?.id) patch["kirvano_subscription_id"] = corpo.subscription.id;
        if (status === "active") {
          patch["current_period_end"] = corpo.subscription?.next_charge_date
            ? new Date(corpo.subscription.next_charge_date).toISOString()
            : trintaDias();
        }

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .upsert(patch as never, { onConflict: "tenant_id" });
        if (error) return new Response(error.message, { status: 500 });

        return Response.json({ ok: true, status });
      },
    },
  },
});
