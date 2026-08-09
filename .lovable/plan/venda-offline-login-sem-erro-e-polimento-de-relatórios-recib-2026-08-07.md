# Venda offline, login sem erro e polimento de relatórios/recibo

Três frentes, nesta ordem.

## 1. Venda offline de verdade  
termine tods os 3 nessa rodada.

Hoje o app abre sem internet e mostra o que já baixou, mas qualquer gravação
falha. Passa a funcionar assim:

- Lançar itens, abrir e fechar conta, e lançar saída **sem sinal**. A operação é
aceita na hora, aparece na tela como se já tivesse gravado, e fica guardada no
aparelho.
- A faixa do topo passa a dizer, com número: **"sem internet — 3 vendas
esperando"**. Voltando o sinal, tudo sobe sozinho na ordem em que foi feito e a
faixa vira um "tudo sincronizado" que desaparece.
- Reenvio nunca duplica: cada operação leva um número próprio criado no aparelho.
Se subiu duas vezes, o banco reconhece e ignora a repetida.
- Se uma operação da fila for recusada pelo banco (por exemplo, conta que outro
aparelho já fechou), ela sai da fila e aparece um aviso claro dizendo qual foi,
em vez de travar as outras.
- Recibo imprime offline (usa os dados da própria venda, sem consultar o banco).

Aviso honesto: só vale no app publicado (não dentro do editor), e enquanto está
sem sinal a hora da venda é a hora do aparelho.

## 2. Tela de login sem erro escondido

A tela `/auth` monta diferente no servidor e no navegador e gera um erro de
hidratação no console (pode causar um pisca ao abrir). Fica renderizando igual
nos dois lados, sem o erro.

## 3. Polimento de relatórios e recibo

- **Fechamento**: as duas seções do detalhe (Entrou/Saiu) ganham subtotal por
forma de pagamento e o dia inteiro passa a ter um botão "imprimir este dia".
- **Produtos mais vendidos**: passa a mostrar também o ticket médio e a fatia de
cada produto no faturamento, com barra proporcional.
- **Recibo**: campos de texto do Admin (cabeçalho livre, redes, mensagem) ganham
contador de caracteres e o preview passa a mostrar quebra de linha real da
bobina, para não sair cortado na impressora.
- Toque no celular: alvos maiores na grade de produtos e teclado numérico nos
campos de valor.

## Detalhes técnicos

**Migração** (uma só):

- `orders.client_op_id text` e `expenses.client_op_id text`, ambos com índice
único parcial por `tenant_id` — chave de idempotência para reenvio.
- `order_items.client_op_id text` com único parcial, para o lote de itens
adicionados não duplicar.

**Fila offline** (`src/lib/fila-offline.ts`, IndexedDB via `idb-keyval`):

- Envelope `{ id: uuid, tipo: "pedido" | "itens" | "saida", carga, criadoEm }`,
gravado antes de tentar a rede.
- `salvarPedido`, `adicionarItens` e `salvarSaida` passam a aceitar
`client_op_id` no `inputValidator`; o handler faz `upsert`/checagem prévia por
essa chave e devolve a linha existente quando já foi gravada.
- `src/lib/sync-offline.ts`: drena a fila em série no `online`, no foco da aba e
ao montar; erros de validação/negócio removem o item e emitem `toast`, erros de
rede mantêm na fila com backoff.
- IDs de pedido gerados no cliente (`crypto.randomUUID()`) para o PDV ter a
comanda na tela offline; escritas otimistas via
`queryClient.setQueryData` nas chaves de comandas/caixa/saídas.
- `FaixaOffline` passa a ler o tamanho da fila de um `useSyncExternalStore` do
módulo da fila.

**Login**: `src/routes/auth.tsx` — remover a divergência servidor/navegador
(estado `pronto` que muda a árvore no primeiro render); manter `ssr: false` na
rota ou renderizar a mesma marcação e só habilitar o botão via atributo.

**Relatórios/recibo**: `fechamentoDiario` em `src/lib/relatorios.functions.ts`
devolve subtotal por forma no detalhe; `fechamento-dias.tsx` e
`relatorios.tsx` consomem; `cartao-recibo.tsx` ganha contadores; ajustes de
`inputMode="decimal"` e alvos em `grade-produtos.tsx`.

## Ordem de entrega

1. Migração + fila offline e sincronizador (com PDV e Saídas usando a fila).
2. Correção do login.
3. Polimento de relatórios, recibo e toque.