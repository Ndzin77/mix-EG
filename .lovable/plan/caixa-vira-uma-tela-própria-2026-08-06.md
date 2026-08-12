# Caixa vira uma tela própria

Estudei o código atual: o restante do plano anterior já está feito (modal de cobrança com chaves de desconto e divisão, atalhos que não roubam a digitação, campo de valor recebido, faixa fina em Vendas com itens por conta, histórico de vendas em Relatórios). Falta só o ponto que você levantou agora.

Hoje o fechamento do dia é uma **aba dentro de Saídas**. Você quer que **Caixa** seja um lugar próprio no menu, do mesmo nível de Saídas e Relatórios.

## O que muda

1. **Nova tela "Caixa"** no menu lateral (e na barra de baixo no celular), entre Saídas e Relatórios, com ícone de carteira. Ela recebe o conteúdo que hoje é a aba "Caixa do dia":
   - Entrou / Saiu / Sobrou do dia
   - Entradas por forma de pagamento (dinheiro, PIX, débito, crédito)
   - "Deve ter na gaveta"
   - Aviso de contas ainda abertas
   - O mesmo seletor de dia (ontem / hoje / calendário) que Saídas já tem

2. **Saídas volta a ser só saídas**: some a barra de abas; ficam o formulário de lançamento, as categorias, "Onde o dinheiro saiu" e os lançamentos do dia. Título volta para "Saídas".

3. Um link discreto entre as duas telas ("ver o caixa do dia" em Saídas e "ver as saídas" em Caixa), para não obrigar a voltar pelo menu.

## Detalhes técnicos

- Nova rota `src/routes/_authenticated/caixa.tsx` com `head()` próprio (título/descrição/OG específicos de fechamento de caixa), consumindo `resumoCaixa` e `listarSaidas` (só para o contador de lançamentos do card "Saiu").
- `saidas.tsx`: remove o estado `aba`, o bloco de abas e a seção de fechamento; ajusta `head()` e `PageHeader` para falarem só de saídas.
- `app-shell.tsx`: novo item `{ to: "/caixa", label: "Caixa", icon: Wallet }`; a grade do menu inferior passa de `grid-cols-4` para `grid-cols-5`.
- O seletor de dia e os helpers (`hoje`, `somarDias`, `rotuloDia`) hoje duplicados passam para um módulo compartilhado usado pelas duas telas.
- Sem mudança de banco e sem mudança nas funções de servidor.
