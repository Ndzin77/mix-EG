/**
 * Recebimento da Kirvano num endereco curto e fixo do Supabase.
 * A regra de negocio vive no banco (funcao public.kirvano); aqui so
 * conferimos o token e repassamos.
 *
 * COMO USAR: abra este arquivo, Ctrl+A, Ctrl+C e cole no painel do Supabase
 * em Edge Functions > kirvano > Edit function > Deploy.
 * Primeira linha do arquivo: barra-asterisco-asterisco. Ultima linha: });
 */

const TOKEN_ESPERADO = "rv@n0)-!PapK1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, security-token, x-kirvano-token, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method === "GET") {
    return Response.json({ ok: true, porta: "kirvano" }, { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const enviado = (
    req.headers.get("security-token") ??
    req.headers.get("x-kirvano-token") ??
    ""
  ).trim();

  const confere = enviado === TOKEN_ESPERADO;
  console.log("Token recebido:", JSON.stringify(enviado), "Confere?", confere);

  if (!confere) {
    return new Response("Invalid token", { status: 401, headers: cors });
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: cors });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const resposta = await fetch(`${url}/rest/v1/rpc/kirvano`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: chave,
      authorization: `Bearer ${chave}`,
      "security-token": TOKEN_ESPERADO,
    },
    body: JSON.stringify(corpo),
  });

  const texto = await resposta.text();
  console.log("RPC respondeu", resposta.status, texto);

  return new Response(texto, {
    status: resposta.ok ? 200 : resposta.status,
    headers: { ...cors, "content-type": "application/json" },
  });
});
