# Vendas: catálogo sob demanda, cobrança dividida limpa e conta editável

## 1. Filtrar esconde também os produtos

- Com o filtro fechado e nenhuma categoria escolhida, a grade de produtos não
aparece: fica só a linha do botão **Filtrar** e um convite curto ("Toque em
Filtrar para ver o cardápio"), deixando a tela respirar.
- Tocando em **Filtrar**, aparecem as categorias (com "Todos"). Escolhendo uma,
o filtro fecha e a grade mostra só aquela categoria, com o selo do nome e o
"x" para voltar ao estado limpo.
- Escolher "Todos" mostra o cardápio inteiro. A busca por texto continua
funcionando sempre, independente do filtro.

## 2. Modal de cobrar — dividir pagamento sem campo duplicado

- Com **Dividir pagamento** ligado, o campo "Quanto o cliente deu em dinheiro?"
sai da tela: no modo dividido a única entrada de valor é a do encaixe de
partes (teclado de valores + **Encaixar parte**).,"OBS:minh asugestao: mas deve continuar tendo somente 1 campo para digitar manualmente o valor, e nao precisa de sugestões"
- O troco da parte em dinheiro continua aparecendo, calculado das partes
encaixadas — sem pedir para digitar de novo.
- Sem dividir, tudo segue como hoje: forma, valor recebido e troco grande.

## 3. Olho individual em cada conta

- Cada conta aberta (e cada mesa ocupada) ganha seu próprio botão de olho ao
lado do valor: mostra/esconde só aquele valor, com transição suave.
- O olho do topo continua existindo, mas passa a valer como "mostrar/esconder
todos" — ao ligar, abre todos; ao desligar, borra todos de novo.

## 4. Conta aberta com modal de detalhes e edição de itens

Nova caixa de diálogo, aberta ao tocar no cartão da conta (ou na mesa ocupada):

- **Cabeçalho**: nome da conta, tempo aberta e total ao vivo.
- **Lista de itens** em linhas grandes: foto do produto, nome, preço unitário,
quantidade e subtotal.
- **− / +** para mudar a quantidade na hora; **caneta** para editar quantidade e
preço com precisão; **lixeira** para excluir o item (com confirmação).
- Cada mudança recalcula o total da conta e reflete na lista lateral e no caixa,
ao vivo entre os dois caixas da loja.
- Rodapé com as ações que já existem: **Receber**, **+ Itens** e **Cancelar
conta**.
- Editar item exige internet (é edição de registro que já está no banco); sem
sinal, o modal avisa e mantém a leitura.

## Detalhes técnicos

- `grade-produtos.tsx`: novo estado "nada escolhido" — `aba: string | null`
iniciando em `null`; grade só renderiza quando `aba !== null`; estado vazio
convidando a filtrar; selo/limpar volta `aba` para `null`.
- `modal-cobranca.tsx`: bloco do "recebido em dinheiro" passa a renderizar
apenas quando `!dividir`; no modo dividir, o cartão de troco usa
`emDinheiro` das partes (sem input), e `recebidoEfetivo` deixa de exigir
digitação.
- `painel-lateral.tsx`: `mostrarValor` vira `Set<string>` de ids visíveis +
botão por cartão/mesa; o olho do topo alterna todos. Cartão passa a abrir o
novo `ModalConta` em vez de só expandir; a expansão inline continua para
espiada rápida.
- Novo `src/components/pdv/modal-conta.tsx`: usa o `Modal` da casa, recebe a
`ComandaCard`, lista itens com `useImagens`, e chama as mutações abaixo com
invalidação de `["comandas"]` e `["caixa"]`.
- Novas server fns em `src/lib/vendas.functions.ts`:
  - `atualizarItemComanda` (`{ item_id, quantity, unit_price? }`) — valida conta
  `open`, atualiza `subtotal` e recalcula `orders.total` a partir da soma dos
  itens menos `discount`.
  - `removerItemComanda` (`{ item_id }`) — apaga a linha, recalcula o total e,
  se a conta ficar sem itens, mantém a conta aberta com total 0.
  Ambas sob `requireSupabaseAuth`, chamadas via `useServerFn` no componente
  (nunca em loader).

## Ordem de entrega

1. Modal de detalhes/edição da conta + server fns.
2. Olho individual por conta e por mesa.
3. Dividir pagamento sem o campo de recebido.
4. Filtrar escondendo a grade de produtos.