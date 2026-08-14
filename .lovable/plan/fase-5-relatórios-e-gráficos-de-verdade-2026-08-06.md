# Fase 5 — Relatórios e gráficos de verdade

Hoje a tela de Relatórios usa série de demonstração fixa no código (`series` e `topProdutos` em `src/routes/_authenticated/relatorios.tsx`) — os números não vêm do banco. Esta fase liga a tela ao movimento real da loja.

## O que vou entregar

1. **Números reais por período**
   - Hoje / Semana / Mês passam a somar as vendas pagas e as saídas lançadas da própria empresa.
   - Cartões de Entradas, Saídas e Resultado (com margem) calculados no servidor, não no navegador.
   - Comparação com o período anterior: "+18% que a semana passada" em verde/vermelho, para dar contexto de um olhar.

2. **Gráfico entrada × saída real**
   - Hoje: por faixa de hora. Semana: por dia da semana. Mês: por semana do mês.
   - Barras verdes (entrada) e vermelhas (saída) mantendo o significado cromático já usado no app.
   - Ao passar o dedo/mouse, o valor exato aparece.

3. **Produtos mais vendidos de verdade**
   - Ranking por quantidade e valor, somado dos itens vendidos no período, com barra de proporção.
   - Mostra também o ticket médio e o número de vendas do período.

4. **Formas de pagamento e saídas por categoria**
   - Quebra do período por dinheiro, PIX, débito e crédito (não só do dia, como hoje em Saídas).
   - Saídas por categoria, para ver onde o dinheiro está indo no mês.

5. **Exportar e imprimir funcionando**
   - Excel (CSV que abre no Excel) e PDF/Imprimir usando a impressão do navegador com layout limpo de uma página.
   - Os três botões deixam de ser enfeite.

6. **Estados honestos**
   - Carregando com esqueleto, e estado vazio com frase da casa ("Nenhum movimento nesse período — dia de sorvete parado").

## Auditoria de encerramento

Login no usuário de teste, conferir Hoje / Semana / Mês contra o que está gravado no banco (soma de vendas pagas e de saídas), confirmar que o ranking de produtos bate com os itens vendidos, exportar o CSV e conferir os valores, e checar o console sem erros. Reporto o resultado e só sigo para a Fase 6 (Recibo) com sua confirmação.

## Detalhes técnicos

- Sem mudança de schema. Uma nova função de servidor `resumoPeriodo` em `src/lib/relatorios.functions.ts` com `.middleware([requireSupabaseAuth])`, recebendo `{ periodo: "hoje" | "semana" | "mes" }` e retornando: totais, série de barras já agrupada, top produtos, formas de pagamento, saídas por categoria e os totais do período anterior para o comparativo.
- Consultas: `orders` (status `paid`, faixa por `closed_at`), `order_items` (join pelos pedidos do período, agregado no servidor) e `expenses` (faixa por `occurred_at`). RLS por empresa já garante o isolamento; a agregação fica no handler, como em `resumoCaixa`.
- `relatorios.tsx` troca as constantes de demonstração por `useQuery` com chave `["relatorios", periodo]`, mantendo o desenho atual (cartões, barras, ranking) e acrescentando os blocos novos.
- Exportação em `src/lib/exportar.ts` (CSV via Blob) e uma folha de estilo de impressão em `src/styles.css` sob `@media print`.
- Se o volume de itens crescer e a agregação no servidor ficar pesada, entra uma função SQL de resumo — aviso antes de criar.
