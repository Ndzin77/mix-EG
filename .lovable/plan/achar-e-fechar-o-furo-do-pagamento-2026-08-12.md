# Achar e fechar o furo do pagamento

## O erro, confirmado

A Kirvano está chamando `https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano`, mas **esse endereço não existe**: não há nenhuma função criada no Supabase deste projeto (a pasta de funções está vazia). Por isso a resposta é `NOT_FOUND` e nenhum pagamento chega. O recebimento existe, sim, mas dentro do aplicativo, em outro endereço.

Achei mais dois problemas que impediriam a liberação mesmo depois de o aviso chegar:

1. **O endereço mostrado na tela de Assinatura está errado.** O código monta o link com um código de projeto antigo (`dfcbfd98-…`), diferente do projeto atual (`1284f4a8-…`). Ou seja: mesmo copiando o link da tela, a Kirvano bateria num lugar que não é este app.
2. **A conciliação no primeiro acesso não consegue gravar.** Quando alguém paga antes de a conta existir, o sistema tenta gravar a assinatura usando a permissão do próprio usuário — e a tabela de assinaturas **não permite escrita por usuário logado**. O erro é engolido e a pessoa continua vendo "Aguardando pagamento" mesmo tendo pago.

## O que vou fazer

### 1. Criar o recebimento no endereço que a Kirvano já usa

Crio a função `kirvano` no Supabase, no endereço exato que você já cadastrou lá (`/functions/v1/kirvano`). Assim você **não precisa mexer em nada no painel da Kirvano** e o recebimento funciona mesmo antes de publicar o app.

Ela faz o mesmo que a porta interna já faz, com a mesma chave `security-token`:

- confere o token `rv@n0)-!ÇaçK1` (já guardado nos segredos do projeto);
- guarda **todo** aviso recebido, mesmo sem conta correspondente — pagamento nunca se perde;
- acha a loja pelo e-mail do comprador (`customer.email`);
- em compra aprovada / assinatura aprovada / renovada: marca **ativa**, plano mensal R$ 39,90 e vencimento na `next_charge_date` que a Kirvano manda (no exemplo, 12/09) — sem data, 30 dias;
- em recusa/atraso: só marca atraso se o período pago já venceu (reenvio não derruba quem está em dia);
- em reembolso, chargeback, cancelamento ou expiração: cancela;
- carrinho abandonado e demais eventos não liberam nada.

A porta interna do app continua existindo como segunda entrada — quem já aponta para ela segue funcionando.

### 2. Corrigir o endereço mostrado na tela

O código do projeto passa a ser o correto, então o link que a tela de Assinatura manda copiar aponta de verdade para este app. E a tela passa a mostrar, em primeiro lugar, o endereço do Supabase — que é o que está configurado hoje na Kirvano.

### 3. Fazer a conciliação gravar de verdade

A aplicação do pagamento guardado no primeiro acesso passa a gravar com permissão de serviço (a mesma que o recebimento usa), com o erro visível em vez de silencioso. Resultado: quem pagou antes de confirmar o e-mail entra assim que confirmar e abrir o sistema, ou ao tocar em **"Já paguei — conferir agora"**.

### 4. Conferir o fluxo inteiro

O fluxo desejado — criar conta na landing → pagar → confirmar e-mail → entrar — passa a valer sem furos:

- sem pagamento confirmado, o sistema fica na tela **Aguardando pagamento** e as funções de servidor recusam (essa trava já existe e continua);
- com pagamento confirmado, acesso liberado até a data da próxima cobrança;
- vencida a data, a tolerância de 7 dias com aviso; depois disso, bloqueio;
- renovação automática da Kirvano reativa sozinha, empurrando a data.

## Validação

- Disparar um POST de teste no endereço do Supabase com o corpo de exemplo que você mandou e o token correto, e confirmar resposta `ok` (hoje dá `NOT_FOUND`).
- Confirmar no banco que a assinatura da loja ficou `active` com vencimento 12/09/2026.
- Repetir sem token e confirmar recusa `401`.
- Conferir a tela de Assinatura mostrando o endereço certo e o estado liberado.

## Detalhes técnicos

- Nova função `supabase/functions/kirvano/index.ts` (Deno, `verify_jwt = false` em `supabase/config.toml`), usando `SUPABASE_SERVICE_ROLE_KEY`, com a mesma lógica de `src/routes/api/public/kirvano.ts` (eventos ativa/cancela/atrasa, `dadosDaCompra` reescrito inline para Deno).
- `src/lib/assinatura.ts`: corrigir `PROJETO` para `1284f4a8-65e0-4763-b143-1a4dffe9fcb2` e exportar `WEBHOOK_URL_SUPABASE`.
- `src/routes/_authenticated/assinatura.tsx`: exibir o endereço do Supabase como principal.
- `src/lib/assinatura.functions.ts` (`sincronizarConta`): trocar o cliente do usuário por `supabaseAdmin` (import dentro do handler) no upsert de `subscriptions` e no update de `kirvano_events`, propagando erro.
