# Caixa com saldo que vira o dia, planilha sem dinheiro e filtro do histórico no lugar

## 1. Caixa: entrada e saída de gaveta, com saldo que passa para o dia seguinte

Hoje a gaveta é calculada só com o movimento do período (vendas em dinheiro − saídas em dinheiro), então ela zera todo dia e pode ficar negativa. Passa a existir um **saldo de gaveta contínuo**.

Como fica:

```text
Deve ter na gaveta        R$ 30,00
  saldo que veio de antes      R$ 50,00
+ vendas em dinheiro           R$ 100,00
+ entradas na gaveta           R$ 0,00
− saídas em dinheiro           R$ 120,00
```

- **Saldo anterior**: soma de tudo que aconteceu na gaveta antes do primeiro dia do período. Dia 1 põe 50 de entrada, vende 100, sai 120 → sobra 30; no dia 2 o caixa já abre mostrando 30.
- **Entrada de gaveta** (troco, aporte, dinheiro que já estava lá) e **saída de gaveta** (sangria, retirada para o banco) viram lançamentos próprios, que só mexem na gaveta física — **não entram como faturamento nem como despesa** nos relatórios.

### Onde se clica

No bloco "Conferir a gaveta", ao lado do "i", entra uma linha clicável de destaque: **"Ajustar gaveta · entrada ou saída"**. Clicar abre um modal:

- dois botões grandes, **Entrada** (verde) e **Saída** (vermelho), como um interruptor — cor = significado, sem ler texto;
- teclado numérico grande para o valor, com atalhos 20 / 50 / 100 / 200;
- campo de motivo (opcional, com sugestões: Troco inicial, Aporte, Sangria, Depósito);
- rodapé mostra ao vivo **como a gaveta fica depois** desse lançamento — o número muda contando (animação), então o efeito é sentido antes de confirmar;
- confirmar dá um selo "lançado" + vibração curta, fecha sozinho, e a gaveta na tela varre em verde.

Abaixo do saldo, lista dos ajustes do período (hora, motivo, valor, com botão de desfazer nos últimos lançamentos).

## 2. Planilha sem dinheiro (só PIX e cartão)

O menu "Planilha" ganha um interruptor no topo: **"Ignorar dinheiro — só PIX e cartão"**, que vale para as duas opções (resumida e detalhada). Com ele ligado:

- vendas recebidas em dinheiro saem da conta; venda dividida entra só com a parte que não foi em dinheiro;
- saídas pagas em dinheiro saem da conta (fica só o que saiu do banco/cartão);
- "Faturou", "Saiu" e "Sobrou" são recalculados com esse recorte, e a coluna Dinheiro some;
- o arquivo sai como `relatorio-resumo-sem-dinheiro-01-08-2026-a-06-08-2026.csv` e a primeira linha diz o recorte, para ninguém confundir planilhas.

## 3. Filtro do histórico de vendas saindo da tela

O filtro (período + busca + duas listas) hoje é uma linha só que estoura a largura. Vira uma grade que quebra: em telas estreitas, período em cima ocupando a linha inteira, busca embaixo, e as duas listas lado a lado em meia largura cada. Nada mais passa da borda.

## Detalhes técnicos

- **Migração**: nova tabela `public.cash_moves` (`id`, `tenant_id`, `kind` `entrada|saida`, `amount`, `note`, `occurred_at`, `created_by`, `created_at`, `client_op_id`) com GRANTs para `authenticated`/`service_role`, RLS por `private.current_tenant_id()` (delete só gerente, no mesmo padrão de `expenses`).
- `src/lib/caixa.functions.ts`: `listarAjustesGaveta`, `saldoGavetaAnterior` (soma vendas em dinheiro − saídas em dinheiro ± `cash_moves` de tudo antes do início do período), `salvarAjusteGaveta`, `excluirAjusteGaveta`.
- `resumoCaixa` em `src/lib/vendas.functions.ts` passa a devolver `saldoAnterior`, `ajustesEntrada`, `ajustesSaida` e a `gaveta` já acumulada.
- Novo `src/components/caixa/modal-gaveta.tsx` usando o `Modal` da casa e `useContagem`; `caixa.tsx` ganha o gatilho e a lista de ajustes.
- Exportação: `movimentoDetalhado` e `fechamentoDiario` passam a expor a repartição por forma de cada pedido e a `origem` de cada saída; `linhasResumo`/`linhasDetalhe` em `src/lib/exportar.ts` recebem `semDinheiro: boolean` e recalculam totais. Ajustes de gaveta ficam fora das planilhas de faturamento (aparecem só no caixa).
- `historico-vendas.tsx`: barra de filtro em `grid grid-cols-2 md:grid-cols-4` com `min-w-0` nos campos.
