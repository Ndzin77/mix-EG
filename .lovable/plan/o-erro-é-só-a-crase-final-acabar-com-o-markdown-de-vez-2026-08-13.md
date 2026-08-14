# O erro é só a crase final: acabar com o markdown de vez

A mensagem do Supabase diz exatamente onde dói:

```text
The module's source code could not be parsed: Unexpected eof at .../kirvano.ts:71:4 ``` ~
```

Na linha 71 do que você colou está ```` ``` ````. Essa linha é a **cerca do
markdown** do documento, não código. Enquanto o código morar dentro de um `.md`,
o "selecionar tudo" vai continuar levando a cerca junto — o problema é o formato
do arquivo, não você.

## O que vou fazer

1. Criar o código como **arquivo TypeScript de verdade**, sem uma única linha de
   markdown: `supabase/functions/kirvano/index.ts`. Você abre esse arquivo no
   editor do projeto, dá Ctrl+A / Ctrl+C e cola no Supabase — não existe cerca
   para colar errado. Primeira linha `/**`, última `});`, ponto.
2. Encolher `docs/kirvano-edge-function.md` para só o passo a passo (endereço,
   Deploy, Verify JWT desmarcado, token na Kirvano), apontando para o arquivo
   `.ts` como fonte do código. Nada de código duplicado em dois lugares.
3. Manter a lógica idêntica à que já validei: confere `security-token` igual a
   `rv@n0)-!PapK1`, responde `GET` como teste de vida, e repassa o evento para o
   RPC `public.kirvano` com a chave de serviço.

## Depois que você fizer o Deploy

Eu testo e mostro o resultado, sem "deve funcionar":

- `POST` com o token certo → `200`, e o log da função com `Confere? true`;
- `POST` sem token → `401`;
- disparo uma compra aprovada de teste e confirmo no banco a assinatura da loja
  em `active` com a data da próxima cobrança.

Nada muda na Kirvano: mesmo endereço, mesmo cabeçalho.

## Detalhes técnicos

- Novo `supabase/functions/kirvano/index.ts` (Deno, autocontido, sem imports).
- `docs/kirvano-edge-function.md` reduzido a instruções.
- `supabase/config.toml` já tem `[functions.kirvano] verify_jwt = false`.
- Sem migração: o RPC `public.kirvano` já valida o token novo.
