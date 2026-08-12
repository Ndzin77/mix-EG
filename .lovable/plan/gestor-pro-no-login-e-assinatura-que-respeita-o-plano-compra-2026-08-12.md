# Gestor Pro no login e assinatura que respeita o plano comprado

Boa notícia primeiro: o banco correto está conectado. Conferi os tipos do banco (a tabela de eventos da Kirvano já aparece lá) e rodei o typecheck: **limpo, nenhum erro**. Nada do resto do projeto quebrou por causa do SQL.

Agora os dois pontos que você levantou.

## 1. A tela de login ainda é "Doce PDV"

O nome antigo ficou só nessa tela: título da aba, texto de compartilhamento e o nome grande em cima do formulário. Passa a ser **Gestor Pro**, no mesmo padrão da landing (mesma marca, mesmo tom), incluindo o texto que aparece quando o link é compartilhado.

## 2. Hoje a assinatura é sempre "mensal" — não é o que você quer

Do jeito que está, qualquer pagamento aprovado vira: plano `mensal`, valor R$ 39,90 e próxima cobrança em 31 dias quando a Kirvano não informa a data. Ou seja, se a pessoa compra **anual** ou **semestral**, o sistema mostra "mensal" e conta os dias errado.

O que muda:

- **O plano vem da Kirvano, não do nosso chute.** O recebimento passa a ler o nome/frequência do plano e o valor pago no aviso da Kirvano e gravar isso na loja. Mensal, trimestral, semestral, anual, semanal — o que vier é o que vale.
- **A data de renovação vem da Kirvano.** Quando ela manda a próxima cobrança, é essa a data. Só se ela não mandar é que o sistema calcula pela frequência do plano (semanal = 7 dias, mensal = 30, trimestral = 90, semestral = 180, anual = 365) em vez de assumir 30 dias sempre.
- **A tela de Assinatura acompanha.** O anel de renovação deixa de usar "30 dias" fixo como referência e passa a usar a duração do plano da pessoa — num plano anual o círculo não fica quase vazio o ano todo. O rótulo mostra "Plano anual · R$ X/ano" com o valor e o período certos, e o botão de pagamento continua o mesmo.
- **Cortesia e primeira conta continuam como estão** (7 dias, mensal, R$ 39,90) — é o padrão de quem ainda não comprou.

Assim, quando você criar novas ofertas na Kirvano (anual, semestral etc.), não precisa mexer no código: basta vender.

## Detalhes técnicos

- `src/lib/assinatura.ts`: novo mapa de planos (rótulo, dias do ciclo, sufixo de preço) + funções `normalizarPlano(texto)` e `diasDoPlano(plano)`; `calcular` recebe os dias do ciclo para o anel.
- `src/routes/api/public/kirvano.ts`: lê `plan`/`offer`/`product` e o valor do payload, grava `plan` e `price` em `subscriptions`, e usa `diasDoPlano` como fallback de `current_period_end` no lugar de 31 dias fixos.
- `src/lib/assinatura.functions.ts`: `sincronizarConta` guarda plano/valor do evento pendente ao aplicar o pagamento; `minhaAssinatura` devolve os dias do ciclo.
- `src/routes/_authenticated/assinatura.tsx`: anel usa os dias do ciclo; rótulo do plano e sufixo (`/mês`, `/ano`) vindos do plano.
- `src/routes/auth.tsx`: marca Gestor Pro em `head()` e no cabeçalho.
