import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { dadosDaCompra, PRECO_MENSAL } from "@/lib/assinatura";

/**
 * Recebimento automático da Kirvano. É a única porta que grava assinatura:
 * o aplicativo só lê. Cada loja é achada pelo e-mail do comprador, então
 * multi-loja continua separado.
 *
 * Todo evento é guardado em `kirvano_events`, mesmo sem loja correspondente:
 * quem paga antes de confirmar o e-mail (ou antes da conta existir) é
 * reconhecido no primeiro acesso. Pagamento não se perde.
 */

const corpoSchema = z.object({
  event: z.string().optional(),
  status: z.string().optional(),
  customer: z.object({ email: z.string().email(), name: z.string().optional(), phone: z.string().optional() }),
  subscription: z.object({ id: z.string().optional(), next_charge_date: z.string().optional(), charge_date: z.string().optional() }).optional(),
}).passthrough();
type Corpo = z.infer<typeof corpoSchema>;

const ATIVA = ["SALE_APPROVED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_APPROVED"];
const CANCELA = [
  "SALE_REFUNDED",
  "SALE_CHARGEBACK",
  "SUBSCRIPTION_CANCELED",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_EXPIRED",
];
const ATRASA = ["SUBSCRIPTION_LATE", "SALE_REFUSED", "ABANDONED_CART"];

const fimDoCiclo = () => new Date(Date.now() + 30 * 86_400_000).toISOString();

/* A Kirvano chama de outro domínio: liberar o preflight evita recusa muda. */
const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, security-token, x-kirvano-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/kirvano")({
  server: {
    handlers: {
      /* Teste de vida: abrir o endereço no navegador confirma que ele existe
         e que o token está configurado — sem expor o token. */
      GET: async () =>
        Response.json(
          { ok: true, porta: "kirvano", pronto: !!process.env["KIRVANO_WEBHOOK_TOKEN"] },
          { headers: cors },
        ),
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const esperado = process.env["KIRVANO_WEBHOOK_TOKEN"];
        const enviado =
          request.headers.get("security-token") ?? request.headers.get("x-kirvano-token") ?? "";
        /* O token tem acentos (Ç, ç). Cabeçalho HTTP não carrega acento com
           segurança: dependendo de quem envia, chega como bytes crus. Aceitar
           também a leitura crua evita recusar um aviso legítimo. */
        const cru = (() => {
          try {
            return new TextDecoder().decode(Uint8Array.from(enviado, (c) => c.charCodeAt(0) & 0xff));
          } catch {
            return enviado;
          }
        })();
        if (!esperado || (enviado !== esperado && cru !== esperado)) {
          return new Response("Invalid token", { status: 401 });
        }


        let corpo: Corpo;
        try {
          corpo = corpoSchema.parse(await request.json());
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const email = corpo.customer?.email?.trim().toLowerCase();
        const evento = (corpo.event ?? corpo.status ?? "").toUpperCase();
        if (!email) return new Response("Missing customer email", { status: 400 });

        /* Sem chave de serviço o registro é impossível: responder erro faz a
           Kirvano reenviar depois, em vez de o pagamento sumir em silêncio. */
        let admin: any;
        try {
          const mod = await import("@/integrations/supabase/client.server");
          admin = mod.supabaseAdmin;
          /* força a criação do cliente aqui, para falhar já com 500 */
          void admin.from;
        } catch (e) {
          console.error("[kirvano] sem acesso administrativo", e);
          return new Response("Server not configured", { status: 500 });
        }

        const compra = dadosDaCompra(corpo);
        const proxima = compra.proxima;

        /* A loja é a do dono que comprou: casamos pelo e-mail do perfil. */
        const { data: perfil } = await admin
          .from("profiles")
          .select("tenant_id")
          .ilike("email", email)
          .maybeSingle();

        const tenant =
          perfil?.tenant_id ??
          (
            await admin
              .from("subscriptions")
              .select("tenant_id")
              .ilike("buyer_email", email)
              .maybeSingle()
          ).data?.tenant_id ??
          null;

        /* Guarda o evento sempre — casado ou não com uma loja. */
        const { error: erroEvento } = await admin.from("kirvano_events").insert({
          buyer_email: email,
          event: evento,
          tenant_id: tenant,
          next_charge_date: proxima,
          payload: corpo as unknown,
        });
        if (erroEvento) console.error("[kirvano] não guardei o evento", erroEvento.message);

        if (!tenant) {
          /* Pagou antes da conta existir: o evento fica guardado e é aplicado
             no primeiro acesso. Respondemos ok para não haver reenvio em laço. */
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
          const { data: atual } = await admin
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
          patch["plan"] = "mensal";
          patch["price"] = PRECO_MENSAL;
          patch["current_period_end"] = proxima ?? fimDoCiclo();
        }

        const { error } = await admin
          .from("subscriptions")
          .upsert(patch as never, { onConflict: "tenant_id" });
        if (error) return new Response(error.message, { status: 500 });

        /* Evento já aplicado: não precisa ser reprocessado no login. */
        await admin
          .from("kirvano_events")
          .update({ processed_at: new Date().toISOString() })
          .ilike("buyer_email", email)
          .is("processed_at", null);

        return Response.json({ ok: true, status });
      },
    },
  },
});
