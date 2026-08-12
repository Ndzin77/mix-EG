import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/auth-middleware";

/**
 * Esqueceu a senha de uma seção? A senha do login vale como chave-mestra.
 * Nada é destravado aqui: o servidor só responde "é você mesma", e a tela
 * então deixa gravar uma senha nova para aquela seção.
 */
export const confirmarSenhaLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ senha: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("Não consegui identificar seu e-mail de login.");

    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseServidor } = await import("@/integrations/supabase/env.server");
    const { url, chave } = supabaseServidor();
    const efemero = createClient(url, chave, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { error } = await efemero.auth.signInWithPassword({ email, password: data.senha });
    if (error) throw new Error("A senha do login não confere.");
    return { ok: true as const, email };
  });
