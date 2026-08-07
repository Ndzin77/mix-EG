import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { supabaseServidor } from "@/integrations/supabase/env.server";

/**
 * Mesmo papel do `requireSupabaseAuth` gerado, com uma diferença: a URL e a
 * chave têm reserva embutida (ver `env.server.ts`), então o sistema funciona
 * hospedado fora do Lovable sem depender de variáveis de ambiente.
 */

function isChaveNova(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function fetchSupabase(chave: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isChaveNova(chave) && headers.get("Authorization") === `Bearer ${chave}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", chave);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { url, chave } = supabaseServidor();

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Sessão expirada. Entre novamente.");
    }
    const token = authHeader.slice("Bearer ".length);
    if (!token || token.split(".").length !== 3) {
      throw new Error("Sessão expirada. Entre novamente.");
    }

    const supabase = createClient<Database>(url, chave, {
      global: {
        fetch: fetchSupabase(chave),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Sessão expirada. Entre novamente.");
    }

    return next({
      context: { supabase, userId: data.claims.sub as string, claims: data.claims },
    });
  },
);
