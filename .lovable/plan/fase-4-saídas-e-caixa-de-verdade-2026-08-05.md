# Fase 4 — Saídas e Caixa de verdade

Hoje a tela de Saídas é maquete: os lançamentos vivem só na memória do navegador e desaparecem ao recarregar (verificado em `src/routes/_authenticated/saidas.tsx`). E o caixa do PDV só soma entradas — não desconta o que saiu. Esta fase liga as duas pontas no banco.

## O que vou entregar

1. **Saídas gravadas no banco**
   - Lançar despesa (descrição, valor, categoria) passa a gravar na tabela de despesas da empresa, com data/hora e quem lançou.
   - Lista do dia vem do banco, atualiza na hora, e o "Desfazer" volta a existir de verdade (remove o lançamento gravado).
   - Excluir segue a regra atual: só dono/gerente pode apagar; operador lança mas não apaga (aparece aviso claro em vez de erro).
   - Categorias continuam fixas (Insumos, Embalagem, Manutenção, Retirada, Outros) — escolher é mais rápido e permite somar depois.

2. **Fechamento de caixa do dia (novo)**
   - Painel do dia com: entradas por forma de pagamento (dinheiro, PIX, débito, crédito), descontos concedidos, saídas por categoria e o **resultado do dia** em destaque.
   - "Dinheiro esperado na gaveta" = vendas em dinheiro − retiradas, para conferir a gaveta física em segundos.
   - Contas ainda abertas aparecem como aviso âmbar ("R$ X a receber, N contas") para ninguém fechar o dia esquecendo alguém.
   - Navegação por dia (ontem/hoje) para conferir o movimento anterior.

3. **Caixa do PDV completo**
   - O medidor lateral passa a mostrar entradas, saídas e o líquido do dia, mantendo o modo privado (cliente do outro lado do balcão não vê).
   - Meta do dia continua medida pelas entradas.

4. **Coerência neuro-design**
   - Vermelho contínuo em Saídas, verde em entradas, âmbar em pendência — nada de cor nova.
   - Alvos grandes, Enter lança, foco volta para a descrição, números animados como no PDV.
   - Estados vazios com frase de sorveteiro ("Nenhuma saída hoje — gaveta intacta").

## Auditoria de encerramento

Antes de propor a Fase 5: login no usuário de teste, lançar 3 saídas de categorias diferentes, recarregar a página e conferir que continuam lá, desfazer uma, fazer uma venda em dinheiro e uma em PIX, abrir o fechamento do dia e conferir que entradas − saídas fecham exatamente com o que foi lançado, e conferir o aviso de conta aberta. Reporto o resultado e só sigo com sua confirmação.

## Detalhes técnicos

- Sem migração de schema nova: `expenses` já tem `tenant_id`, `description`, `amount`, `category`, `occurred_at`, `created_by` e RLS por empresa (delete restrito a gerente). Se o fechamento pedir agregação pesada, entra uma função SQL de resumo por dia — aviso antes.
- Novo `src/lib/saidas.functions.ts` com `listarSaidas` (faixa de datas), `salvarSaida` e `excluirSaida`, todas com `.middleware([requireSupabaseAuth])` e `tenant_id` vindo do perfil, no mesmo padrão de `vendas.functions.ts`.
- `resumoCaixa` em `src/lib/vendas.functions.ts` ganha quebra por forma de pagamento, desconto, total de saídas do dia, aberto a receber e parâmetro opcional de data.
- `src/routes/_authenticated/saidas.tsx` troca `useState` por `useQuery` + `useMutation` (invalidando `saidas` e `caixa`), e recebe o bloco de fechamento do dia.
- `src/components/pdv/painel-lateral.tsx` passa a ler o resumo ampliado; o modo privado cobre também as saídas.
- Cabeçalho `head()` da rota de Saídas atualizado para refletir o fechamento de caixa.
