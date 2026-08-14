# Fechar o que faltou: a trava do pagamento também no servidor

Estudei o código atual. O que o plano anterior já entregou está de pé:

- não existe mais cortesia automática: sem evento confirmado da Kirvano, a leitura devolve `pending` e o layout autenticado mostra a tela **Aguardando pagamento**;
- só `SALE_APPROVED`, `SUBSCRIPTION_APPROVED` e `SUBSCRIPTION_RENEWED` liberam; o resto nunca libera;
- pagamento feito antes da conta existir é conciliado no primeiro acesso;
- campo de senha já vai com `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`;
- limite de e-mails já tem mensagem em português e espera no botão de reenviar;
- a tela de login já é **Gestor Pro**, e a verificação de tipos está limpa (rodei agora, zero erros).

Falta o pedaço que importa de verdade, e é o que este plano faz.

## 1. A trava hoje é só visual — vai passar a valer no servidor

A tela de ativação esconde o sistema, mas as funções de servidor (vendas, conta, caixa, saídas, relatórios, produtos/loja, preparo) continuam respondendo para qualquer conta logada. Ou seja: quem não pagou não vê o sistema, mas o sistema ainda atende.

- Nova verificação de assinatura no servidor, aplicada em todas essas funções: sem pagamento confirmado (ou passada a tolerância de 7 dias), a chamada é recusada com uma mensagem clara de pagamento pendente.
- As funções de assinatura (ler estado, link de pagamento, conferir pagamento) e o cadastro continuam livres — são justamente o caminho para regularizar.
- A tolerância continua igual: vencido, os 7 dias valem com aviso; depois disso, bloqueio.
- Resultado colateral bom: a checagem é lembrada por alguns minutos por usuário, no mesmo estilo do cache de sessão já existente, então não adiciona uma ida ao banco por clique.

## 2. Link da bancada segue a loja

O link público da bancada abre sem login. Ele passa a respeitar a mesma regra: loja sem pagamento confirmado mostra "acesso suspenso — fale com o responsável" em vez da fila de preparo.

## 3. Assinaturas antigas de teste

Contas antigas ainda gravadas como `trialing` sem evento confirmado já são tratadas como não pagas pela leitura atual. Vou confirmar por consulta que nenhuma loja fica presa num estado híbrido (status ativo sem evento) e, se houver, normalizo o registro.

## 4. Fechamento com o build de verdade

O que ficou pendente no plano anterior: validar o build. Vou rodar o build de produção e conferir a tela de ativação e o fluxo "Já paguei — conferir agora" no navegador, além de olhar o console em busca de aviso de hidratação (a tela de login está com `ssr: false`, então não deve haver — mas confirmo em vez de supor).

## Detalhes técnicos

- Novo middleware `exigirAssinatura` em `src/lib/assinatura.server.ts` (encadeado depois de `requireSupabaseAuth`), que lê `subscriptions` da loja, aplica `calcular()` e lança erro quando `bloqueado`.
- Encadear esse middleware em `src/lib/vendas.functions.ts`, `conta.functions.ts`, `saidas.functions.ts`, `relatorios.functions.ts`, `loja.functions.ts`, `preparo.functions.ts` — mantendo `assinatura.functions.ts` e `cadastro.functions.ts` fora.
- Cache curto por usuário para o estado da assinatura, no mesmo padrão dos mapas de sessão/loja já usados em `auth-middleware.ts`.
- `src/lib/bancada.server.ts` / rota `bancada.$token.tsx`: checar a assinatura da loja do token antes de devolver a fila.
- Sem migração de banco necessária; se aparecer registro incoerente, corrijo com um `UPDATE` pontual em migração própria.
