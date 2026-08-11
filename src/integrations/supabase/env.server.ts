/**
 * Onde o servidor acha a loja no Supabase.
 *
 * O aplicativo no navegador conversa com o projeto abaixo (o mesmo que está
 * embutido em `integrations/supabase/client.ts`). Se o servidor apontasse para
 * outro projeto, a sessão do usuário seria recusada e a tela mostraria
 * "Sessão expirada" mesmo com o login recém-feito. Por isso o endereço do
 * projeto é fixo aqui, e as variáveis de ambiente só valem quando são do
 * mesmo projeto.
 */
const PROJETO_URL = "https://inrnuaqblqrwgvsvqgte.supabase.co";
const PROJETO_CHAVE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlucm51YXFibHFyd2d2c3ZxZ3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjY4OTIsImV4cCI6MjEwMTAwMjg5Mn0.pSd5ey2-fXDLtErMb0zSeZ1PHiVRfXc6vF1Vb1T0yiE";

function mesmoProjeto(url?: string) {
  return !!url && url.replace(/\/+$/, "") === PROJETO_URL;
}

export function supabaseServidor(): { url: string; chave: string } {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const chave =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (mesmoProjeto(url) && chave) return { url: url!, chave };
  return { url: PROJETO_URL, chave: PROJETO_CHAVE };
}

