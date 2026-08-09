# Senhas, recibo ao vivo, gráficos, Admin e assinatura

Sete frentes numa leva só. Cada uma resolve uma dor concreta que você descreveu.

## 1. Senhas que realmente exigem o mínimo

Hoje o campo diz "mínimo 4 caracteres" mas o botão salva assim mesmo em alguns caminhos.

- Regra única de validação (mínimo 4, sem espaços) aplicada em: cadeado de seção (Admin), senha da bancada e senha de conta.
- Botão desabilitado enquanto a senha não é válida + medidor de força em 3 barras (fraca/boa/forte) e mensagem embaixo do campo em vez de só toast.
- Feedback imediato ao digitar (verde quando passa), que é o que faz a pessoa corrigir sem frustração.

## 2. Esqueceu a senha do cadeado? Use a senha de login

Cada cadeado (Saídas, Caixa, Relatórios, Admin) e a senha da bancada ganham a opção **"Esqueci esta senha"**:

- A pessoa digita o e-mail e a senha de login do sistema; validamos no servidor contra o Supabase Auth.
- Confirmado, ela define a nova senha da seção na hora — sem precisar apagar nada no banco.
- Só quem é dono/gerente do tenant pode fazer isso.

## 3. Config. do recibo: opções rolam, o papel fica parado

No desktop o modal vira duas colunas de verdade: a coluna da esquerda (Papel → Cabeçalho → Corpo → Rodapé) rola sozinha; o recibo fica **fixo** (sticky) à direita, sempre visível, com zoom.

- Navegação por abas no topo da coluna de opções (Papel · Cabeçalho · Corpo · Rodapé), então a rolagem fica curta.
- Cada mudança pisca suavemente a parte correspondente do papel (destaque de 600 ms) — você vê exatamente o que mexeu.
- No celular: papel fixo no topo em versão reduzida, opções rolando embaixo.

## 4. Gráficos que dizem alguma coisa

- Eixo vertical em formato curto (R$ 0, R$ 250, R$ 1,2 mil) em vez de repetir "R$ 0,00".
- Escala calculada pelos dados reais do período; com tudo zerado, o gráfico dá lugar a um aviso "Sem movimento neste período".
- Período de 1 mês agrupa por semana/dia conforme o tamanho da faixa, para a linha não virar um traço reto.
- Saídas viram barras (evento pontual) sobre a área de entradas (fluxo contínuo) — leitura instantânea de "entrou × saiu".
- Gráfico certo para cada pergunta: fluxo = área, ranking = barra deitada, formas de pagamento = rosca com destaque no líder.

## 5. Bancada mostra o estado da senha

O cartão da bancada no Admin passa a mostrar um selo claro: **"Senha definida"** (verde, com data da última troca) ou **"Sem senha — o link não abre"** (vermelho pulsante), além de "Esqueci esta senha" do item 2.

## 6. Admin organizado

O Admin vira abas fixas no topo, com contadores: **Cardápio · Loja · Recibo · Bancada · Segurança**.

- Cardápio: busca, filtro por categoria, agrupamento por categoria com contagem, ativar/desativar em massa e cartão de produto mais legível (foto, preço, nº de sabores).
- Cada aba guarda a posição, então voltar não perde o lugar.

## 7. Assinatura (Kirvano) — multi-tenant

- Nova tabela de assinatura por tenant: status, plano, data do próximo vencimento, dias em atraso e identificação do cliente na Kirvano.
- Endpoint público de webhook para a Kirvano (`/api/public/kirvano`), com verificação de assinatura por segredo, que ativa/renova/cancela a assinatura do tenant certo.
- Ao entrar no sistema com pagamento atrasado, aparece um modal: "Pagamento atrasado há X dias — faltam Y dias para o acesso ser bloqueado" (limite de 7 dias), com botão de pagar. Nos primeiros dias ele é dispensável; do 5º dia em diante fica mais insistente.
- Passados 7 dias, o acesso é bloqueado numa tela única de regularização (o dado continua intacto).

## 8. Landing page + cadastro antes do pagamento

A rota `/` passa a ser a landing pública (o painel de vendas vai para `/vendas`, com redirecionamento automático de quem já está logado).

- Uma oferta só: **R$ 39,90/mês promocional**, com prova de valor curta, prints do sistema e um único botão.
- Antes de pagar, um formulário curto em 3 passos (barra de progresso, um campo por vez): nome da loja e telefone → e-mail e senha → confirmação. A conta já nasce configurada.
- Ao concluir, criamos a conta e mandamos para o checkout da Kirvano; o webhook libera o acesso.

## Detalhes técnicos

- Validação de senha centralizada em `src/lib/travas.ts`; recuperação via server function nova que revalida credenciais com `signInWithPassword` num cliente efêmero e confere papel do usuário.
- Migração: tabela `subscriptions` (tenant_id único, status, plan, current_period_end, grace_until, kirvano_customer_id/subscription_id) com GRANTs, RLS por tenant e leitura via `private.current_tenant_id()`; escrita apenas por service role no webhook.
- Segredo `KIRVANO_WEBHOOK_SECRET` e `KIRVANO_CHECKOUT_URL` pedidos na hora da implementação.
- Cadastro público via server function com service role: cria usuário, tenant, perfil e `store_settings` já preenchidos.
- Gráficos continuam em Recharts, com tokens de cor do design system; formatação compacta em `src/lib/relatorios.ts`.
- Recibo: layout `grid lg:grid-cols-[1fr_auto]` com coluna direita `sticky top-0` e área esquerda com rolagem própria.
