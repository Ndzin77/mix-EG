# Fase 6 — Recibo

Estudei o código atual: a venda é fechada em `salvarPedido` (retorna só `{ id, total }`), a cobrança acontece no `ModalCobranca` e a mensagem do recibo já é editável no Admin (`receipt_footer` → `mensagemRecibo`). Falta o recibo em si: hoje nada é impresso nem entregue ao cliente.

## O que vou entregar

1. **Recibo impresso na hora da venda**
  - Ao confirmar a cobrança, além do "Desfazer" que já existe, aparece **Imprimir recibo** — sem bloquear o próximo atendimento (quem não imprime é só não tocar).
  - Formato bobina 80mm por padrão (o que a sorveteria usa), com opção A4 para quando a cliente precisar de uma via maior.
2. **Conteúdo do recibo**
  - Logo da EG Mix, nome da loja, telefone e endereço (do Admin).
  - Nº/identificação da venda, data e hora, e o nome da comanda/mesa quando houver.
  - Itens: quantidade × produto, preço unitário e subtotal.
  - Subtotal, desconto concedido, total, forma(s) de pagamento, valor recebido e troco quando for dinheiro.
  - Mensagem personalizada do rodapé, já configurada no Admin.
3. **Reimprimir depois**
  - Em Relatórios, uma lista das vendas do período com botão de reimprimir — cliente voltou pedindo a nota, sai em dois toques, buscando os dados direto do banco.
4. **Personalização no Admin**
  - Bloco "Recibo" ganha pré-visualização ao vivo da bobina enquanto a dona edita a mensagem, e chaves para mostrar/ocultar telefone, endereço e logo.
5. **Auditoria de encerramento**
  - Venda de teste com desconto e conta dividida, conferir os números do recibo contra o banco, testar reimpressão a partir de Relatórios, checar a pré-visualização de impressão em 80mm e A4, e console limpo.

## Detalhes técnicos

- Novo componente `src/components/recibo/recibo.tsx` (marcação da bobina) + `src/components/recibo/imprimir.tsx` (área oculta na tela, visível só em `@media print`), evitando `window.open` que o navegador bloqueia.
- Regras de impressão em `src/styles.css`: `@page { size: 80mm auto }` para bobina e uma variante A4, escopadas para não afetar a folha de Relatórios que já existe.
- `salvarPedido` passa a devolver também os dados necessários ao recibo (itens, desconto, formas, data) para não precisar de uma segunda ida ao banco logo após a venda.
- Nova função de servidor `reciboDaVenda` em `src/lib/vendas.functions.ts` (`.middleware([requireSupabaseAuth])`) para reimpressão, e `listarVendas` do período para a lista em Relatórios.
- Sem mudança de schema — `orders`, `order_items` e `store_settings` já têm tudo. As chaves de exibição (mostrar logo/telefone/endereço) entram como preferências locais em `src/lib/config.ts`; se você quiser que sigam a loja no banco, aviso antes de criar as colunas.
- De quebra, corrijo o erro de hidratação que aparece hoje na tela `/auth`.  
  
  
(ALEM DISSO, É BOM DIVIDIR EM MAIS DE UMA FORMA DE PAGAMENTO, NSO SPENSD 2, E MEIO QUE VOU COLOCANDO UMA OPARTE, E O SISTEMA MOSTRA QUANTO FALTA, EM VEZ DE ADICIONAR PRIMEIRO A 2° PARTE DO PAGAMETO, MOSTRANDO COMO RESTO A 1° PARTE)
- )