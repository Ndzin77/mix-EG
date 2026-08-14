# Cadastro que entra na hora, pagamento que nunca se perde e aviso que aparece

Dois problemas reais apareceram no teste: a conta nova não conseguiu entrar ("E-mail ainda não confirmado") e a assinatura vencida ontem não avisou nada. Os dois têm causa conhecida e ficam resolvidos nesta leva.

## 0. Primeiro: destravar o build (arquivo de tipos do banco)

O arquivo `src/integrations/supabase/types.ts` foi sobrescrito novamente com o schema de **outro** projeto Supabase (aparecem tabelas como `public_stores`, `categories`, `products.store_id`). Por isso o build está quebrado em ~40 pontos: `subscriptions`, `profiles`, `store_settings` e `products` "não existem" para o TypeScript.

A conferência já foi feita: o commit `943f988` tem a versão correta (com `profiles`, `store_settings`, `subscriptions`). O primeiro passo da execução é restaurar esse arquivo e confirmar o typecheck limpo — nada mais funciona antes disso. Em modo de planejamento não é permitido escrever nesse arquivo, então essa correção sai junto com a aprovação.


## 1. "E-mail ainda não confirmado" — cadastro pela landing

O que acontece: o Supabase deste projeto está com confirmação de e-mail ligada. Ao criar a conta pela landing, o Supabase não devolve sessão, então os ajustes iniciais (nome da loja, telefone, cortesia de 7 dias) não são gravados e a pessoa paga no checkout e depois é barrada no login.

O que muda:

- **Tela pós-cadastro honesta**: em vez de mandar direto para o login, a landing mostra um passo "Confirme seu e-mail" com o endereço em destaque, botão **Reenviar e-mail de confirmação** e botão de ir para o checkout.
- **Login com saída**: quando o erro for de e-mail não confirmado, o login mostra um bloco "Reenviar confirmação para {e-mail}" com confirmação visual do envio. Nada de beco sem saída.
- **Ajustes iniciais garantidos**: sem sessão no cadastro, nome da loja, telefone e cortesia ficam guardados nos dados do usuário e são aplicados no primeiro login.

Recomendação opcional (fora do código): desligar "Confirm email" em Authentication > Providers > Email deixa o fluxo instantâneo. Com o código acima funciona nos dois modos.

## 2. Pagamento nunca se perde (webhook)

Hoje, se a Kirvano avisa antes da conta existir, o sistema responde "ok" e descarta o evento. E o webhook depende de uma chave de serviço que não está configurada — nesse caso quebra em silêncio.

O que muda:

- Todo evento recebido passa a ser **guardado** numa tabela de eventos, casado ou não com uma loja.
- No primeiro login (e ao abrir a tela de Assinatura), o sistema procura eventos guardados com o e-mail da pessoa e aplica: pagamento aprovado vira assinatura ativa com a próxima data de cobrança.
- Faltando a chave de serviço, o webhook responde erro visível (a Kirvano reenvia) em vez de fingir sucesso.

## 3. Aviso de vencimento que realmente aparece

O aviso atual é um modal dispensável que, uma vez fechado, não volta na mesma sessão — foi por isso que a EG Mix não viu nada. E não existe aviso antes de vencer.

- **Faixa fixa no topo de todas as telas** enquanto houver atraso: "Pagamento atrasado há X dias — faltam Y dias de acesso" + botão Pagar. Não se dispensa.
- **Contagem dos 7 dias de tolerância** na faixa e no modal, com barra que se esvazia.
- **Modal uma vez por dia** (não por sessão), insistente do 5º dia em diante e tela de regularização no 7º.
- **Aviso calmo antes de vencer**: nos 3 dias finais do ciclo, faixa discreta "Renova em 2 dias" com botão de pagar.
- **Menu**: o ponto vermelho da Assinatura passa a mostrar também os dias restantes.

## 4. SQL para colar no Supabase (projeto `inrnuaqblqrwgvsvqgte`)

```sql
-- 1) confirmar o e-mail da conta de teste
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = 'fernandorochademoura@gmail.com';

-- 2) marcar essa conta como mensal paga (30 dias)
update public.subscriptions s
set status = 'active', plan = 'mensal', price = 39.90,
    current_period_end = now() + interval '30 days',
    buyer_email = 'fernandorochademoura@gmail.com',
    last_event = 'SALE_APPROVED', updated_at = now()
from public.profiles p
where p.tenant_id = s.tenant_id
  and lower(p.email) = 'fernandorochademoura@gmail.com';

-- 3) EG Mix vencida ontem (para ver o aviso de atraso funcionando)
update public.subscriptions s
set status = 'past_due', current_period_end = now() - interval '1 day', updated_at = now()
from public.profiles p
where p.tenant_id = s.tenant_id
  and lower(p.email) = 'eg@gmail.com';
```

## Detalhes técnicos

- Nova tabela `public.kirvano_events` (e-mail, evento, payload, próxima cobrança, processado_em) com RLS: só service role escreve; leitura pelo tenant dono. Migração com GRANTs.
- `src/routes/api/public/kirvano.ts`: grava o evento sempre; aplica em `subscriptions` quando encontra tenant; retorna 500 quando a chave de serviço falta.
- Server function autenticada `sincronizarConta`: consome eventos pendentes do e-mail logado, aplica os dados pendentes da loja e a cortesia; chamada no layout autenticado e na tela de Assinatura.
- `src/lib/cadastro.functions.ts`: sem sessão, retorna `precisaConfirmar: true` + checkout; landing exibe o passo de confirmação.
- `src/routes/auth.tsx`: reenvio via `supabase.auth.resend({ type: 'signup' })`.
- Novo `src/components/faixa-assinatura.tsx` usado no `AppShell`; `AvisoAssinatura` passa a dispensar por dia (`localStorage` com a data) e mostrar os dias restantes.
