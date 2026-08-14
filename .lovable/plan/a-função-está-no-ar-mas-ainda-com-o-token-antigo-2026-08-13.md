# A função está no ar, mas ainda com o token antigo

Testei agora o endereço `https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano`:

```text
GET  -> 200  {"ok":true,"porta":"kirvano"}
POST com security-token: rv@n0)-!PapK1  -> 401 Invalid token
```

E nos registros da função só aparecem linhas de `booted` — **nenhum** dos
`console.log("Token recebido...")` que existem no código novo. Conclusão: o
código que está publicado ainda é a **primeira versão**, a que espera o token
antigo com acentos. A colagem mais recente não entrou (provavelmente o Deploy
não foi concluído, ou o editor recusou porque o texto colado incluía as linhas
de documentação que vieram depois do `});` — `## Conferir depois de publicar`,
` ```toml `, etc., que não são código).

## O que eu vou fazer

1. Reescrever `docs/kirvano-edge-function.md` em formato **à prova de colagem**:
   o código fica sozinho, sem nenhum texto depois dele, e as instruções de
   conferência sobem para antes do bloco. Assim não há como arrastar linhas de
   documentação junto.
2. Simplificar a função: como o token novo `rv@n0)-!PapK1` é só ASCII, some toda
   a ginástica de acentos/encoding. Fica uma comparação direta, mais curta e mais
   fácil de colar sem erro — mantendo os `console.log` para diagnóstico.
3. Manter tudo o mais igual: `verify_jwt = false`, repasse para o RPC
   `public.kirvano` com a chave de serviço, CORS e `GET` de teste de vida.

## O que você faz (1 minuto)

Supabase → Edge Functions → `kirvano` → Edit function → **apagar tudo** → colar o
bloco do documento → **Deploy**. A primeira linha deve ser `/**` e a última `});`
— nada depois disso.

## Como eu confirmo

Assim que você avisar, eu mesmo testo e mostro o resultado:

- `POST` com o token certo deve responder `200` e gravar o evento;
- os registros da função devem mostrar `Confere? true`;
- disparo uma compra aprovada de teste e confirmo no banco que a assinatura da
  loja ficou `active` com a data de próxima cobrança.

Nada muda na Kirvano: o endereço e o cabeçalho continuam os mesmos.

## Detalhes técnicos

- `docs/kirvano-edge-function.md`: reordenar seções (instruções antes, código por
  último) e trocar `confere()` por comparação estrita com `TOKEN_ESPERADO`.
- Sem migração de banco: o RPC `public.kirvano` já valida o token novo e foi
  testado com sucesso via `curl`.
- `supabase/config.toml` já tem `[functions.kirvano] verify_jwt = false`.
