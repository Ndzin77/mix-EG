import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

/* Validar a sessão contra o Supabase a cada clique custava uma ida à rede
   antes de qualquer coisa. O resultado agora é lembrado por alguns minutos —
   o mesmo token dentro da validade não paga esse pedágio de novo. */
type Sessao = { userId: string; claims: Record<string, unknown>; ate: number };
const sessoes = new Map<string, Sessao>();
const VALIDADE = 5 * 60_000;

function lembrada(token: string) {
  const s = sessoes.get(token);
  if (!s) return null;
  if (s.ate < Date.now()) {
    sessoes.delete(token);
    return null;
  }
  return s;
}

function guardar(token: string, userId: string, claims: Record<string, unknown>, exp?: number) {
  /* nunca além da expiração do próprio token */
  const limite = exp ? exp * 1000 : Number.POSITIVE_INFINITY;
  const ate = Math.min(Date.now() + VALIDADE, limite);
  if (ate <= Date.now()) return;
  if (sessoes.size > 500) sessoes.clear();
  sessoes.set(token, { userId, claims, ate });
}

/* A loja do usuário também era consultada em toda gravação. */
const lojas = new Map<string, { tenant: string; ate: number }>();

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

    const cache = lembrada(token);
    if (cache) {
      return next({
        context: { supabase, userId: cache.userId, claims: cache.claims },
      });
    }

    /* `getClaims` valida o token localmente e compara com o relógio da
       máquina. Se o servidor está alguns segundos atrasado, um token recém
       emitido é recusado com "JWT issued at future". Nesse caso (e em
       qualquer falha de verificação local) confirmamos com o próprio
       Supabase, que é a fonte da verdade. */
    let claims: Record<string, unknown> | null = null;

    const local = await supabase.auth.getClaims(token).catch(() => null);
    if (local?.data?.claims?.sub) {
      claims = local.data.claims as Record<string, unknown>;
    } else {
      const { data: usuario, error: erroUsuario } = await supabase.auth.getUser(token);
      if (erroUsuario || !usuario?.user?.id) {
        throw new Error("Sessão expirada. Entre novamente.");
      }
      claims = { sub: usuario.user.id, email: usuario.user.email };
    }

    guardar(token, claims.sub as string, claims, typeof claims.exp === "number" ? claims.exp : undefined);

    return next({
      context: { supabase, userId: claims.sub as string, claims },
    });
  },
);

type ContextoLoja = { supabase: SupabaseClient<Database>; userId: string };

/** Loja (tenant) do usuário logado, lembrada por alguns minutos. */
export async function tenantDoUsuario(context: ContextoLoja): Promise<string> {
  const guardado = lojas.get(context.userId);
  if (guardado && guardado.ate > Date.now()) return guardado.tenant;

  const { data, error } = await context.supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Perfil da loja não encontrado.");

  lojas.set(context.userId, { tenant: data.tenant_id as string, ate: Date.now() + VALIDADE });
  return data.tenant_id as string;
}

