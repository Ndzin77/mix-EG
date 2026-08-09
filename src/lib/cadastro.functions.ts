import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Cadastro pela página de venda: a conta nasce já configurada com o nome da
 * loja e o telefone, antes mesmo do pagamento. Assim a pessoa entra e o
 * sistema já parece dela — menos atrito, mais conversão.
 */
const esquema = z.object({
  loja: z.string().trim().min(2).max(80),
  responsavel: z.string().trim().min(2).max(80),
  telefone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(160),
  senha: z.string().min(6).max(64),
});

export const criarConta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => esquema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.responsavel, store_name: data.loja },
    });
    if (error) {
      throw new Error(
        /already/i.test(error.message)
          ? "Esse e-mail já tem conta. Entre pelo login."
          : error.message,
      );
    }
    const userId = criado.user?.id;
    if (!userId) throw new Error("Não consegui criar a conta. Tente de novo.");

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenant = perfil?.tenant_id;

    if (tenant) {
      await supabaseAdmin
        .from("store_settings")
        .update({ store_name: data.loja, phone: data.telefone })
        .eq("tenant_id", tenant);
      await supabaseAdmin.from("subscriptions").upsert(
        {
          tenant_id: tenant,
          status: "trialing",
          buyer_email: email,
          current_period_end: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        } as never,
        { onConflict: "tenant_id" },
      );
    }

    const base = process.env["KIRVANO_CHECKOUT_URL"] ?? "";
    const checkout = base
      ? `${base}${base.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}&name=${encodeURIComponent(data.responsavel)}&phone=${encodeURIComponent(data.telefone)}`
      : "";

    return { ok: true as const, checkout };
  });
