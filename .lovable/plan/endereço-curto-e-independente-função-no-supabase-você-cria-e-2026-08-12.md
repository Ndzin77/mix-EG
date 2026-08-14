# Endereço curto e independente: função no Supabase (você cria, eu escrevo o código)

## Por que hoje não dá

- O endereço do banco (`/rest/v1/rpc/kirvano`) é longo porque o Supabase **exige** a chave pública colada na URL. Não há como encurtar.
- O endereço do aplicativo depende de um domínio (Lovable, Vercel ou o seu).
- Uma **Edge Function** do Supabase resolve os dois: o endereço fica curto e é do Supabase, não de domínio nenhum:

```text
https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano
```

Sim, você pode criar essa função manualmente pelo painel do Supabase — é só colar o código. Esta plataforma não consegue publicar funções nesse projeto externo, mas o painel do Supabase consegue, e o resultado é idêntico.

## O que vou fazer

1. Escrever o código completo da função `kirvano` (pronto para colar no editor do Supabase), com a mesma lógica que já funciona hoje:
   - confere o cabeçalho `security-token` (a chave `rv@n0)-!ÇaçK1`) e recusa sem ele;
   - guarda todo aviso recebido, mesmo sem conta ainda criada — pagamento nunca se perde;
   - acha a loja pelo e-mail do comprador;
   - compra aprovada / assinatura aprovada / renovada → **ativa** até a data que a Kirvano manda (sem data, 30 dias);
   - atraso/recusa → só derruba se o período pago já venceu;
   - reembolso, chargeback, cancelamento, expiração → cancela.
   
   Internamente ela apenas chama a lógica que já está no banco, então nunca haverá duas regras diferentes convivendo.
2. Passar o passo a passo do painel: Edge Functions → Deploy a new function → nome `kirvano` → colar → Deploy → e **desmarcar a verificação de JWT** (Settings da função), para a Kirvano poder chamar sem chave.
3. Guardar o código no projeto em `supabase/functions/kirvano/index.ts` e marcar `verify_jwt = false` no `supabase/config.toml`, para o código ficar versionado junto com o app.
4. Atualizar a tela de Assinatura: esse endereço curto passa a ser o principal, com os outros como alternativa. De quebra, corrigir o código de projeto errado (`1284f4a8-…`) que hoje faz o link do app apontar para outro lugar.
5. Testar de verdade: chamar o endereço com o token certo e confirmar a assinatura ativa no banco; repetir sem token e confirmar recusa.

## Detalhes técnicos

- `supabase/functions/kirvano/index.ts` (Deno): lê o corpo bruto, valida `security-token` (aceitando também os bytes crus por causa dos acentos), responde `GET` como teste de vida e repassa o JSON para o RPC `public.kirvano` usando `SUPABASE_SERVICE_ROLE_KEY` (já disponível como variável na Edge Function), encaminhando o header do token; CORS liberado com `OPTIONS` 204.
- `supabase/config.toml`: `[functions.kirvano] verify_jwt = false`.
- `src/lib/assinatura.ts`: nova constante `WEBHOOK_URL_FUNCAO` como principal; `PROJETO` corrigido para `e5469dc6-8497-47a9-95ba-9361523d4dc3`.
- `src/routes/_authenticated/assinatura.tsx`: ordem dos endereços e botão de copiar em cada um.
