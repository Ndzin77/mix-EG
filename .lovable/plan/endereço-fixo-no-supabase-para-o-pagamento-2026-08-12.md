# Endereço fixo no Supabase para o pagamento

Você tem razão no incômodo: hoje o recebimento só existe dentro do aplicativo (`/api/public/kirvano`), então o endereço muda conforme o domínio que você usa. O endereço do Supabase (`https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano`) não depende de domínio nenhum — é o mesmo hoje, amanhã, com `meudominiogestorpro.com.br` ou com qualquer outro front.

Conferi o projeto agora: **não existe nenhuma função criada no Supabase** (a pasta de funções nem existe; só há migrações). Por isso a Kirvano recebe `NOT_FOUND`. O que falta é criar essa função e publicá-la.

## O que vou fazer

### 1. Criar e publicar a função `kirvano` no Supabase

No endereço exato que você já cadastrou na Kirvano — você **não mexe em nada no painel dela**. A função fica aberta (sem exigir login do Supabase) e é protegida pela sua chave `security-token`, que já está guardada nos segredos do projeto.

Ela faz o mesmo que a porta interna já faz hoje:

- confere o token (aceitando também a forma "crua" com os acentos `Ç`/`ç`, que viajam distorcidos em cabeçalho HTTP);
- guarda **todo** aviso recebido, mesmo sem conta correspondente — pagamento nunca se perde;
- acha a loja pelo e-mail do comprador;
- compra aprovada / assinatura aprovada / renovada → **ativa**, com vencimento na data que a Kirvano manda (`next_charge_date`; sem ela, 30 dias);
- recusa/atraso → só marca atraso se o período pago já venceu (reenvio não derruba quem está em dia);
- reembolso, chargeback, cancelamento, expiração → cancela;
- carrinho abandonado e demais eventos não liberam nada.

Abrir o endereço no navegador passa a responder um "estou vivo", útil para conferir sem disparar pagamento.

### 2. Manter a porta do aplicativo como segunda entrada

`/api/public/kirvano` continua existindo e funcionando igual. Se um dia a função do Supabase for removida, nada quebra.

### 3. Tela de Assinatura mostrando o endereço certo

A tela passa a mostrar o endereço do Supabase como o principal (o que está na Kirvano hoje), com o endereço do aplicativo listado abaixo como alternativa.

## Validação

- Disparar um POST de teste no endereço do Supabase, com o corpo real que você mandou e o token certo → esperar `ok` (hoje dá `NOT_FOUND`).
- Conferir no banco que a assinatura ficou `active` com vencimento 12/09/2026, e apagar o dado de teste depois.
- Repetir sem token → esperar recusa `401`.

## Detalhes técnicos

- Nova função `supabase/functions/kirvano/index.ts` (Deno), publicada pela ferramenta de deploy; `verify_jwt = false` em `supabase/config.toml`.
- Usa `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (já presentes nos segredos do Supabase) e `KIRVANO_WEBHOOK_TOKEN`.
- Lógica copiada de `src/routes/api/public/kirvano.ts`, com `dadosDaCompra` reescrito inline (a função Deno não importa de `src/`).
- `src/routes/_authenticated/assinatura.tsx` / `src/lib/assinatura.ts`: expor e destacar o endereço do Supabase.
