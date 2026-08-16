# Quase lá: a função foi publicada, só sobrou a "cerca" do markdown no código

Boa notícia: a função `kirvano` **existe** no Supabase e a verificação de JWT **já está desligada** (a chamada chega até o seu código, sem 401).

O que ainda falha: ao colar, veio junto a primeira linha ```` ```ts ```` (e a última ```` ``` ````) da documentação. O log do Supabase mostra exatamente isso:

```text
ERROR event loop error: ReferenceError: ts is not defined
    at .../kirvano.ts:1:1
```

Ou seja: o Deno tenta executar a palavra `ts` como código e a função morre no boot — por isso o endereço responde `500 WORKER_ERROR` em vez de `{"ok":true}`.

## Correção (1 minuto, no painel do Supabase)

1. Supabase → **Edge Functions** → `kirvano` → **Edit function**.
2. Apagar a **primeira linha** ```` ```ts ```` e a **última linha** ```` ``` ````. Nada mais.
   - A primeira linha do arquivo deve ser `/**` e a última `});`.
3. **Deploy**.

Se preferir, apague tudo e cole de novo o código de `docs/kirvano-edge-function.md` — só o miolo, sem as cercas.

## O que eu faço em seguida

- Testo o endereço na hora: `GET` deve devolver `{"ok":true,"porta":"kirvano"}` e `POST` sem o cabeçalho `security-token` deve devolver `401`.
- Disparo um evento de compra aprovada de teste com o token correto e confirmo no banco que a assinatura da loja ficou ativa, mostrando o resultado.
- Ajusto `docs/kirvano-edge-function.md` para o código aparecer em um bloco que deixa claro onde começa e termina, evitando a mesma armadilha numa próxima vez.

Nenhuma mudança de banco, nada a alterar na Kirvano: o endereço continua
`https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano`.
