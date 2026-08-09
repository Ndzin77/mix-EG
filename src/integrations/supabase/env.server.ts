/**
 * Onde o servidor acha a loja no Supabase.
 *
 * No Lovable as variáveis chegam por `process.env`; em hospedagens de fora
 * (Vercel, Netlify, servidor próprio) elas costumam não existir, e aí as
 * leituras falhavam em silêncio e a tela parecia vazia. Como a chave publicável
 * já vai embutida no aplicativo de qualquer jeito, usamos ela como reserva.
 */
export function supabaseServidor(): { url: string; chave: string } {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env["VITE_SUPABASE_URL"];
  const chave =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !chave) {
    throw new Error(
      "Configuração do Supabase ausente no servidor (URL/chave publicável).",
    );
  }
  return { url, chave };
}
