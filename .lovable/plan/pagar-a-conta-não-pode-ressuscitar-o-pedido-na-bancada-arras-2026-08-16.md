# Pagar a conta não pode ressuscitar o pedido na bancada + arrastar que obedece

Estudei o código atual (PDV, `salvarPedido`, fila de preparo e quadro com dnd-kit). Os dois defeitos têm causa confirmada e nenhuma delas é "a tela".

## 1. Por que os cards voltam ao pagar

Quando a conta já existe e o vendedor cobra, o PDV manda a venda inteira com o `id` da conta. No servidor, `salvarPedido` **apaga todos os itens da conta e insere tudo de novo**. Item novo no banco = `prep_status` de fábrica ("a fazer") + hora de criação de agora. Resultado exato do que você viu: a bancada recebe de volta, como pedido novo, algo que já foi montado e entregue.

Correção: pagar deixa de reescrever os itens. O servidor passa a **comparar** o que veio da tela com o que já está na conta:

- item que já existia continua sendo a mesma linha — quantidade e preço são atualizados quando mudam, e o estado de preparo (a fazer / montando / pronto / entregue) e a hora de chegada são preservados;
- item realmente novo entra como cartão novo na bancada (é o certo: pediram mais);
- item retirado da conta some da bancada junto;
- só pagar, sem mexer em nada, não toca em item nenhum — a bancada nem pisca.

Para isso cada linha do carrinho vinda de uma conta aberta viaja com a identidade da linha original (o PDV já tem esse identificador em mãos, hoje ele é jogado fora no envio).

Fecho ainda a porta ao lado: item já **entregue** nunca reaparece na fila, mesmo que a conta seja reaberta ou editada depois.

## 2. Por que arrastar não obedece

O arrasto grava certo, mas a leitura desmonta a ordem. A fila mistura duas réguas: item arrastado ganha posição 10, 20, 30…, e item nunca arrastado é ordenado pelo horário em segundos (um número na casa dos bilhões). Na hora de ordenar, qualquer cartão arrastado pula para o topo absoluto e os outros ficam como estavam — parece que o arrasto "não pegou" ou pegou errado.

Correção:

- toda a fila passa a ter posição de verdade: quem ainda não tem recebe uma na hora, seguindo a ordem de chegada, então as duas réguas viram uma só;
- ao soltar, o servidor grava as posições numa única operação e a ordem vale para a tela logada e para o link da bancada;
- reordenar dentro de uma coluna não bagunça as outras.

E o arrasto ganha corpo: pegador maior (48 px) com resposta imediata ao toque, cartão que **levanta** com sombra e leve inclinação enquanto viaja, vizinhos abrindo espaço com transição suave, vibração curta no celular ao pegar e ao soltar, e a numeração #1, #2, #3 recalculando na hora — sem esperar o servidor. Se o servidor recusar, o cartão volta ao lugar com um tremor e um aviso, em vez de mentir.

## 3. Neurociência aplicada (bancada e PDV)

- **Um só "próximo"**: o #1 da coluna "A fazer" ganha destaque de contraste e uma borda viva; os demais recuam. Cérebro cansado não escolhe — ele obedece ao que salta.
- **Cor com significado fixo**, igual ao resto da casa: cinza esperando, âmbar passou do alerta, vermelho pulsando atrasado. Nada de cor decorativa.
- **Fechamento sensorial**: "Pronto" dispara varredura verde no cartão, selo curto e um toque sonoro opcional; a tarefa termina no corpo, não só na tela.
- **Cartão novo chega anunciado**: entra com animação de cima, brilho de 1,5 s e selo "+ novo", para o ajudante perceber sem varrer a tela.
- **Entregue some com direção** (desliza para fora) em vez de piscar — movimento diz "acabou" melhor que texto.
- **Sem susto ao pagar**: se a cobrança realmente adicionar itens, o PDV avisa "2 itens novos foram para a bancada"; se não adicionar nada, silêncio — ausência de aviso é informação.
- Respeita `prefers-reduced-motion` e mantém os alvos de toque ≥ 48 px.

## 4. Auditoria antes de dizer que acabou

Abro uma conta com itens, marco tudo como pronto/entregue na bancada, pago a conta e confirmo que **nada volta**; depois abro outra conta, cobro somando um item novo e confirmo que só o item novo vira cartão; arrasto cartões nas três colunas, recarrego e confirmo que a ordem permaneceu, inclusive no link compartilhado. Reporto o que passou e o que não passou.

## Detalhes técnicos

- Migração: preencher `order_items.prep_ordem` das linhas existentes a partir de `created_at` e passar a gravar posição na criação (default por sequência), evitando a mistura de escalas; índice em (`tenant_id`, `prep_ordem`).
- `src/lib/vendas.functions.ts` → `salvarPedido`: o ramo com `id` deixa de fazer `delete` + `insert` em `order_items`. Passa a diferenciar por `item_id` (novo campo opcional no `itensSchema`): `update` de quantidade/preço/subtotal nos existentes, `insert` só dos novos, `delete` dos ausentes. `order_payments` continua sendo reescrito (correto — só há uma cobrança válida).
- `src/routes/_authenticated/vendas.tsx` → `linhasParaBanco` passa a enviar `item_id` quando `l.uid` for um UUID vindo da comanda; retorno do servidor informa quantos itens novos entraram, para o aviso do PDV.
- `src/lib/preparo.functions.ts`: `montarFila` ordena só por `prep_ordem` (fallback estável por `created_at` apenas quando ainda nulo); `reordenarPreparo` / `reordenarBancada` gravam em uma chamada única (`upsert` em lote) e continuam filtrando por tenant; itens `delivered` seguem fora da consulta.
- `src/components/preparo/quadro.tsx`: um `DndContext` por coluna mantido, mas com `useSortable` usando `transition` própria, `DragOverlay` para o cartão levantado, `navigator.vibrate` no início/fim, `activationConstraint` de toque reduzido para 120 ms, e destaque do primeiro cartão. Novas classes de animação (`fila-entra`, `fila-sai`, `varredura`) em `src/styles.css`, todas com `@media (prefers-reduced-motion: reduce)`.
- Nada depende de host: as correções são server functions do próprio app, que rodam igual no domínio da Vercel.
