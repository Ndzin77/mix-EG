# Vendas: cobrança sem conflito, conta mais rápida e catálogo com foto

Tudo nesta leva é na tela de Vendas (PDV) e no painel de contas abertas.

## 1. Filtro de categorias

- Com o filtro fechado e nenhuma categoria escolhida, o selo "Todos" some — a
  linha fica só com o botão **Filtrar**, devolvendo espaço para os produtos.
- Escolhendo uma categoria, aparece o selo com o nome dela e um "x" para voltar
  a ver tudo num toque.

## 2. Mais vendidos abre sozinho ao passar o mouse

- Passando o mouse na linha "Mais vendidos", os atalhos abrem sozinhos; ao tirar
  o mouse, voltam a fechar (a não ser que você tenha clicado para deixar fixo).
- Some o texto "6 atalhos"; fica só a seta e o nome.
- No celular, onde não existe mouse, continua abrindo com o toque.

## 3. Modal de cobrar — dividir pagamento

- Ligando **Dividir pagamento**, some o campo solto de digitar valor: fica só a
  forma escolhida e o botão **Encaixar parte**, com um teclado rápido de valores
  e a opção de encaixar tudo que falta.
- Se a parte encaixada for em dinheiro, o **troco aparece na hora**, sem precisar
  digitar de novo o valor recebido.

## 4. Desconto e divisão deixam de brigar

Hoje, ligar ou mexer no desconto **apaga as partes já encaixadas**. Passa a
funcionar assim:

- As partes ficam onde estão. O desconto muda só o total a pagar.
- Se o desconto deixar o total menor do que já foi encaixado, aparece um aviso
  claro ("já encaixado R$ X, acima do novo total") e o botão **Ajustar partes**,
  que reduz a última parte para caber — nada some sem você mandar.
- O "Falta R$ X" continua ao vivo, recalculado a cada mudança.

## 5. Confirmar com valor errado avisa antes

Ao apertar Confirmar:

- Faltando valor: "Falta R$ X para fechar" — dá para **fechar mesmo assim**
  (o resto sai na forma selecionada) ou voltar.
- Encaixado acima do total: aviso de sobra em R$ X, com opção de corrigir.
- Dinheiro recebido menor do que a parte em dinheiro: pede confirmação.
- Quando está tudo certo, confirma direto como hoje.

## 6. "De quem é essa conta" — teclado e nomes salvos

- Atalho de teclado para abrir: **A** (de anotar) no PDV, e dentro do pop-up as
  teclas 1–9 escolhem os atalhos de mesa/destino na ordem em que aparecem.
- Campo de nome com **sugestões de clientes já usados**, estilo busca: digita
  "an" e aparecem "Ana do flocos", "Antônio"… setas para escolher, Enter anota.
- **Anotar deixa de travar**: o pop-up fecha na hora e a gravação segue por
  baixo (igual já acontece sem internet). Se der erro, o aviso aparece e a conta
  volta para a tela em vez de sumir.

## 7. Produto com foto onde ele aparecer

- A busca do PDV passa a mostrar a miniatura do produto na frente do nome
  (mesma foto do Admin; sem foto, o ícone de sorvete).
- As linhas do carrinho e os atalhos de "Mais vendidos" também ganham a foto.

## 8. Contas abertas — esconder valor de cada conta

- O mesmo "olho" que já esconde o total passa a borrar **o valor de cada conta**
  da lista e das mesas, com transição suave. Um toque mostra tudo, outro esconde.

## 9. Soltar não desmancha o que foi selecionado

Hoje **Soltar** limpa também o carrinho — por isso, escolher produtos, clicar no
atalho da conta e soltar joga tudo fora.

- **Soltar** passa a soltar só o vínculo com a conta/mesa: os itens continuam na
  tela, prontos para vender no balcão ou para outra conta.
- Para esvaziar de verdade continua existindo o caminho de limpar (Esc com a
  busca vazia), e ele mantém o **desfazer** de 6 segundos.
- Ao abrir uma conta para "somar itens", o que já estava selecionado é mantido em
  vez de ser descartado.

## Detalhes técnicos

- `grade-produtos.tsx`: selo de categoria condicional (`aba !== TODOS`) com botão
  de limpar.
- `index.tsx`: `atalhosAbertos` vira `fixado || hover` (`onMouseEnter/Leave` no
  contêiner, desligado em toque via `useIsMobile`); `limpar` é dividido em
  `soltarConta()` (zera `comandaAtiva`/`destino`) e `limparTudo()`; `abrirComanda`
  com `receber=false` deixa de chamar `setCarrinho([])`.
- `modal-cobranca.tsx`: `aplicarDesconto`/`alternarDesconto` param de zerar
  `partes`; nova checagem `excedente = pago - aPagar` com botão de ajuste;
  `onConfirmar` passa por uma confirmação (`useConfirmar`) quando `falta > 0`,
  `excedente > 0` ou `recebido < emDinheiro`; no modo dividir o input de valor sai
  e entra um teclado de valores + "tudo que falta"; troco calculado das partes em
  dinheiro sem depender de `recebido`.
- `modal-cliente.tsx`: `<datalist>`/lista de sugestões alimentada por uma nova
  server fn `nomesClientes` em `vendas.functions.ts` (`select distinct label from
  orders` do tenant, últimos 90 dias, ordenado por frequência), em cache no
  TanStack Query; teclas 1–9 e Enter; `onConfirmar` dispara e fecha sem `await`.
- Fotos: reutilizar `useImagens` na busca, nos atalhos e nas linhas do carrinho —
  os produtos já carregam `image_url`.
- `painel-lateral.tsx`: `mostrarValor` passa a valer também para o valor de cada
  card e mesa (`blur-[6px]` + `select-none`).

## Ordem de entrega

1. Cobrança (dividir, desconto sem conflito, troco automático, aviso ao confirmar).
2. Conta: atalho de teclado, sugestões de nome, anotar sem espera.
3. Soltar/seleção, filtro de categorias, mais vendidos no hover.
4. Fotos nos produtos e olho por conta.
