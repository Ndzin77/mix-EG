/**
 * Bancada pública: verificação do link compartilhado. Fica aqui, fora do
 * arquivo de server functions, porque usa a chave de serviço — o ajudante
 * não tem login no sistema, entra só pelo link + senha da bancada.
 */
import { senhaConfere, type Trava } from "@/lib/travas";
import { lojaLiberada } from "@/lib/assinatura-guard";

export async function tenantDaBancada(token: string, senha: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("store_settings")
    .select("tenant_id, preparo_senha")
    .eq("preparo_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  /* O link só morre quando a loja gera outro código — o token é a chave. */
  if (!data) throw new Error("Link inválido. Peça um link novo para a loja.");

  const trava = data.preparo_senha as Trava | null;
  if (!trava?.hash) throw new Error("Bancada sem senha definida. Peça para a loja configurar.");
  if (!(await senhaConfere(senha, trava))) throw new Error("Senha da bancada incorreta.");
  /* O link segue a loja: assinatura pendente fecha a bancada também. */
  if (!(await lojaLiberada(supabaseAdmin as never, data.tenant_id))) {
    throw new Error("Acesso suspenso — fale com o responsável pela loja.");
  }
  return data.tenant_id;
}
