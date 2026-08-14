# Painel Mestre — controle de todos os clientes sem SQL

Você digita no login normal o e-mail e a senha secretos e, em vez de entrar na loja, cai num painel de dono da plataforma: lista de todas as lojas, com botões para liberar, bloquear, renovar por X dias e criar um cliente novo. Nada de Supabase, nada de SQL.

## Como funciona para você

1. Na tela de login, digita o e-mail secreto e a senha secreta.
2. O sistema reconhece, mostra uma animação curta de "modo mestre" e leva para `/mestre`.
3. Lá dentro:
   - **Lista de lojas**: nome, e-mail do dono, plano, situação (verde = pago, âmbar = vence em ≤3 dias, vermelho = bloqueado) e dias restantes em número grande.
   - **Busca** por e-mail ou nome da loja, e filtros rápidos: Todos · Pagos · Vencendo · Bloqueados.
   - **Cartão do cliente** (abre em modal): chave grande **Liberado / Bloqueado** que pinta o cartão inteiro, régua de dias (7 · 30 · 90 · 180 · 365 ou digitado), plano e preço. Prévia em português antes de salvar: "Vai liberar eg@gmail.com por 30 dias — até 13/09/2026." Confirmação animada depois.
   - **Criar cliente**: e-mail, nome da loja, senha inicial e dias liberados. Cria a conta já confirmada (sem precisar de e-mail de confirmação) e já com o pagamento marcado.
   - **Ações rápidas** na linha: +30 dias, bloquear, copiar e-mail — com desfazer por alguns segundos em vez de caixa de confirmação.

Design: mesma linguagem do app (cores fixas por significado, números grandes, toque grande), nada piscando; movimento só como resposta ao seu clique.

## Segurança (importante)

A combinação secreta não pode viver no código do navegador — qualquer pessoa consegue ler. Então:

- E-mail e senha mestres ficam guardados como segredos do projeto (`MESTRE_EMAIL`, `MESTRE_SENHA`) e a conferência acontece **no servidor**, com comparação à prova de medição de tempo.
- Ao acertar, o servidor grava um cookie de sessão criptografado (`SESSION_SECRET`, gerado automaticamente). Todas as ações do painel exigem esse cookie no servidor — a rota `/mestre` sozinha não libera nada.
- A tela de login continua idêntica; ela só tenta o modo mestre quando o login normal do Supabase falha, então nada muda para as lojas.
- Você poderá trocar a senha mestra depois sem mexer em código.

## Detalhes técnicos

- Segredos: `MESTRE_EMAIL` = `fernandorochademoura@@admin.com`, `MESTRE_SENHA` = `ouvaiouracha`, `SESSION_SECRET` gerado.
- Novo `src/lib/mestre.functions.ts` (thin wrapper de `createServerFn`): `entrarMestre`, `sairMestre`, `listarLojas`, `salvarAssinatura`, `criarCliente`. Sessão via `useSession` do `@tanstack/react-start/server`; helper `exigirMestre()` em `src/lib/mestre.server.ts` que lança `redirect({ to: "/auth" })`.
- Escrita com `supabaseAdmin` importado **dentro** do handler (`await import("@/integrations/supabase/client.server")`), depois de validar a sessão mestre. `listarLojas` junta `tenants`, `profiles` e `subscriptions`; `salvarAssinatura` faz `upsert` em `subscriptions` com `status`, `plan`, `price`, `current_period_end = now() + dias` e `last_event = 'SALE_APPROVED'` (o que `calcular()` em `src/lib/assinatura.ts` exige) ou `'SUBSCRIPTION_CANCELED'` ao bloquear.
- `criarCliente` usa `supabaseAdmin.auth.admin.createUser({ email_confirm: true })`; o trigger `handle_new_user` já cria tenant, perfil, papel e configurações — depois só grava a assinatura.
- Nova rota pública `src/routes/mestre.tsx` (`ssr: false`, fora de `_authenticated`), com `errorComponent`/`notFoundComponent` e `head()` próprio (`noindex`). Componentes novos em `src/components/mestre/` (lista, cartão do cliente, criar cliente), reutilizando `Modal`, `Confirmar` e as classes de animação de `src/styles.css`.
- `src/routes/auth.tsx`: no `catch` de credenciais inválidas, tenta `entrarMestre`; em caso de sucesso, transição animada e `navigate({ to: "/mestre" })`. Sem embutir a senha no bundle.
- Sem migração de banco e sem alteração de RLS.
