# Retomando de onde parou: só falta o acabamento da bancada

Não precisava mandar tudo de novo. Conferi o código: as duas correções principais já estão no lugar.

## Já feito (confirmado no código)

- **Pagar não ressuscita pedido**: `salvarPedido` compara itens por `item_id` (atualiza existentes, insere só o que é novo, remove o que saiu). O PDV já envia `item_id` das linhas vindas da comanda.
- **Ordem da fila numa régua só**: `montarFila` ordena por posição com desempate por hora, e o helper `lugaresDaFila` existe e é usado tanto em `reordenarPreparo` quanto em `reordenarBancada`. O erro de build daquele dia sumiu.

## O que ainda falta (é isto que vou fazer)

O acabamento neuro do quadro da bancada, que ficou de fora:

- **Um só "próximo"**: o #1 da coluna "A fazer" salta com contraste e borda viva; os outros recuam.
- **Arrasto com corpo**: pegador maior (48 px), toque respondendo mais rápido (120 ms), cartão levantando com sombra e leve inclinação enquanto viaja, vizinhos abrindo espaço, vibração curta ao pegar e ao soltar.
- **Fechamento sensorial**: marcar "Pronto" dispara varredura verde no cartão; "Entregue" sai deslizando para fora em vez de piscar.
- **Cartão novo anunciado**: entra de cima com brilho curto e selo "+ novo".
- **Se o servidor recusar** a nova ordem, o cartão volta ao lugar com tremor e aviso, em vez de mentir.
- Tudo respeitando `prefers-reduced-motion` e alvos de toque ≥ 48 px.

## Auditoria antes de dizer que acabou

Abro uma conta, marco itens como pronto/entregue, pago e confirmo que nada volta; cobro somando um item novo e confirmo que só ele vira cartão; arrasto nas três colunas, recarrego e confirmo que a ordem ficou — inclusive no link compartilhado da bancada.

## Detalhes técnicos

- `src/components/preparo/quadro.tsx`: `DragOverlay` para o cartão levantado, `useSortable` com transição própria, `TouchSensor` delay 220 → 120 ms, handle dedicado de 48 px, `navigator.vibrate` no `onDragStart`/`onDragEnd`, destaque condicional do primeiro cartão de "todo".
- `src/styles.css`: classes `fila-entra`, `fila-sai`, `varredura-pronto`, `tremor-erro`, todas dentro de `@media (prefers-reduced-motion: reduce)` com fallback estático.
- Reordenação otimista já existe nas rotas; adiciono o toast de falha com o tremor no cartão afetado.
- Sem mudança de servidor ou banco — roda igual no domínio da Vercel.
