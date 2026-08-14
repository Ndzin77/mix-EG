# Cobrança: o caixa registra o que entrou de verdade

Hoje, se o total é R$ 30 e o cliente paga R$ 28 no PIX ou R$ 35, o sistema grava R$ 30 do mesmo jeito: o valor digitado é usado só para calcular troco na tela e é descartado na hora de salvar. Além disso podem aparecer dois pop-ups de aviso seguidos, com textos longos e repetidos.

## O que muda

**1. Vale o que entrou de verdade**

- O valor digitado passa a ser o valor da venda.
- Pagou menos: a diferença vira desconto e a venda fecha pelo valor recebido.
- Pagou mais: a diferença vira acréscimo e a venda fecha pelo valor recebido.
- Em dinheiro, quando a pessoa usa os atalhos de cédula (R$ 50 para uma conta de R$ 42), continua sendo troco — não vira acréscimo. Troco existe só em dinheiro.  
Mas so pq passou ou nao o valor quando é dinheiro, existe o caso da pessoa ter o troco e nao ter o troco, e simlesmente deixar ali, entao deve existir alguma solução pra isso 
- Em PIX/débito/crédito, valor a mais é sobra/acréscimo (nunca troco) e valor a menos é desconto — sempre com aviso antes de fechar.
- Conta dividida: o que foi encaixado nas partes é o que vale; se as partes somarem mais ou menos que os produtos, a diferença também é acréscimo/desconto, em vez de ser cortada em silêncio.

**2. Um aviso só, curto**

Sai o encadeamento de pop-ups. Passa a existir uma confirmação única, com três linhas:

```text
Fechar com diferença
Produtos R$ 30,00 · Recebido R$ 28,00
Falta R$ 2,00 → entra como desconto
[ Corrigir ]  [ Fechar assim ]
```

Para valor a mais: "Sobra R$ 5,00 → entra como acréscimo". Para dinheiro com troco correto: nenhum aviso, só o painel de troco como já é hoje. Some também o aviso vermelho duplicado de "sobra" dentro do modal, substituído por uma faixa fina com a diferença.

**3. Tela mais clara**

- Painel grande do rodapé mostra **Troco** só em dinheiro; nos outros casos mostra **Diferença** (falta/sobra) com a cor certa.
- O botão Confirmar deixa claro o que vai ser gravado: "Confirmar R$ 28,00".

## Detalhes técnicos

- `src/components/pdv/modal-cobranca.tsx`: unificar as quatro chamadas de `confirmar()` em uma só, calculada a partir de uma única função `diferenca()`; separar troco (só `cash` com atalho de cédula) de sobra/acréscimo; remover o bloco duplicado de excedente.
- `src/routes/_authenticated/index.tsx` (`finalizar`): o total enviado passa a ser a soma real das partes/valor recebido; `discount` recebe a diferença a menos (limitado ao bruto) e a diferença a mais entra como valor da parte, não é descartada.
- `src/lib/vendas.functions.ts` (`salvarPedido`): hoje o servidor força a soma das partes a bater com `bruto − desconto` (ajuste de centavos na última parte). Passa a aceitar a soma informada como total quando a diferença for maior que R$ 0,01, mantendo o ajuste só para centavos de arredondamento. `received`/troco continuam só para o recibo.
- Recibo: mostra "Desconto" ou "Acréscimo" conforme o caso; troco só quando houver dinheiro.
- Nada muda no banco: `orders.total`, `orders.discount` e `order_payments` já comportam isso, então os relatórios e o fechamento passam a bater com a gaveta sem migração.