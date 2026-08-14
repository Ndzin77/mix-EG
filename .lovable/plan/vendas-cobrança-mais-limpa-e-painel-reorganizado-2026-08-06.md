# Vendas: cobrança mais limpa e painel reorganizado  
  
obs: eu li o plano e coloquei "obs" minhas observações, pq nao concordei com tudo

## 1. Modal de cobrança — desconto recolhido

- O bloco de desconto vira uma **chave (checkbox/switch) "Aplicar desconto"**, desligada por padrão.
Fechada, ocupa uma linha só; ao ligar, abre os controles. Desligar zera o desconto na hora.
- Dentro dele, um **seletor R$ / %**: digita 10 em "%" e vira 10% do valor; digita 10 em "R$" e
desconta dez reais. O outro valor aparece ao lado ("10% = −R$ 4,50"), sem calculadora na mão.
- Os atalhos 5% / 10% / 15% continuam, agora dentro do bloco aberto.

## 2. Bug das teclas 1-2-3-4

Hoje o atalho de forma de pagamento é escutado na janela inteira: digitar "3" no campo de valor
troca a forma de pagamento em vez de escrever o número. Passa a ignorar as teclas quando o foco
está num campo de digitação — o mesmo vale para Enter e "+" enquanto se digita.

## 3. "Quanto o cliente deu em dinheiro" vira campo

Sai a fileira de botões de cédula, entra **um campo para digitar o valor recebido**, com o troco
gigante logo abaixo como já é hoje. As cédulas ficam como sugestões pequenas embaixo do campo
(toque opcional), não mais como a única forma de informar.

## 4. Modal mais enxuto

- A lista de partes já pagas, o encaixe parcial e o dinheiro só aparecem quando fazem sentido,
e o bloco de **conta dividida** também passa a ser uma chave "Dividir pagamento" — quem paga
tudo numa forma só vê: valor, formas, confirmar.
- Resultado: o modal aberto cabe na tela sem rolagem no caso comum.

## 5. Vendas: histórico de contas

Na coluna lateral, "Contas abertas" ganha duas abas: **Abertas** e **Fechadas hoje**.
Em Fechadas, cada linha mostra conta, horário, total e forma de pagamento, com toque para ver
os itens e reimprimir o recibo. A busca por nome vale para as duas abas.  
obs: em contas abertas é parra ser possivel ver o que foi pedido pela pessoa  
e é bom mover o hitoico de vendas para relatorios

## 6. "Caixa de hoje" sai de Vendas

O bloco do caixa (entrou / saiu / sobrou / meta) sai do painel de Vendas e passa a viver na tela
de **Saídas, renomeada para "Caixa"** — que já é onde entra e sai dinheiro do dia. No lugar dele,
em Vendas fica apenas uma faixa fina com o total em aberto e o contador de contas.  
obs: mantenha como saidas somente para as saidas, se quiser coloque outra aba de caixa com o restante que ta em "saida" que  nao é de saida.

## Detalhes técnicos

- `modal-cobranca.tsx`: estado ganha `descontoAtivo`, `descontoModo: "reais" | "percent"` e
`dividir`; o `keydown` global filtra `e.target` sendo INPUT/TEXTAREA/contenteditable.
Cálculo do desconto continua em `cent()` e permanece salvo em reais no banco (coluna `discount`).
- `painel-lateral.tsx`: remove o bloco do caixa; abas locais com `useState`; a aba Fechadas usa a
função existente `listarVendas` com o dia de hoje, e a reimpressão reaproveita `reciboDaVenda`
e o componente de recibo já existente.
- `saidas.tsx` passa a consumir `resumoCaixa` (já existe) para o cartão do caixa do dia; rótulo do
menu em `app-shell.tsx` muda para "Caixa" mantendo a rota `/saidas`.
- Sem mudança de banco.
- De quebra, corrijo o erro de hidratação que aparece hoje na tela `/auth`.