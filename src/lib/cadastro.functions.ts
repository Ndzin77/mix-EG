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
    /* Cadastro roda com a chave pública: a conta se cria pelo próprio
       login (signUp) e os ajustes iniciais vão na sessão da pessoa, sem
       depender de chave de serviço no servidor. */
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseServidor } = await import("@/integrations/supabase/env.server");
    const { url, chave } = supabaseServidor();
    const cliente = createClient(url, chave, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const email = data.email.toLowerCase();

    const { data: criado, error } = await cliente.auth.signUp({
      email,
      password: data.senha,
      /* Os dados ficam guardados no próprio usuário: no primeiro acesso o
         sistema termina o cadastro sozinho, mesmo que a confirmação de
         e-mail impeça a sessão agora. */
      options: {
        data: { full_name: data.responsavel, store_name: data.loja, phone: data.telefone },
      },
    });
    if (error) {
      throw new Error(
        /already|registered|exists/i.test(error.message)
          ? "Esse e-mail já tem conta. Entre pelo login."
          : error.message,
      );
    }
    const userId = criado.user?.id;
    if (!userId) throw new Error("Não consegui criar a conta. Tente de novo.");

    if (criado.session) {
      const { data: perfil } = await cliente
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      const tenant = perfil?.tenant_id;

      if (tenant) {
        await cliente
          .from("store_settings")
          .update({ store_name: data.loja, phone: data.telefone })
          .eq("tenant_id", tenant);
        await cliente.from("subscriptions").upsert(
          {
            tenant_id: tenant,
            status: "trialing",
            buyer_email: email,
            current_period_end: new Date(Date.now() + 7 * 86_400_000).toISOString(),
          } as never,
          { onConflict: "tenant_id" },
        );
      }
    }

    const { PLANO_URL, linkPagamento } = await import("@/lib/assinatura");
    const base = process.env["KIRVANO_CHECKOUT_URL"] || PLANO_URL;
    const checkout = linkPagamento(base, {
      email,
      nome: data.responsavel,
      telefone: data.telefone,
    });

    /* Sem sessão = o Supabase exige confirmar o e-mail. Quem paga precisa
       saber disso ANTES de bater na tela de login e levar um "não". */
    return { ok: true as const, checkout, precisaConfirmar: !criado.session, email };
  });
