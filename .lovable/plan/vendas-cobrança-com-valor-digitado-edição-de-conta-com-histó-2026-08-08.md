# Vendas: cobrança com valor digitado, edição de conta com histórico e filtro que fica aberto

## 1. Campo de valor sem "dividir pagamento"

Hoje o campo de digitar valor só aparece quando a forma escolhida é Dinheiro
("Quanto o cliente deu em dinheiro?"). Em PIX, débito ou crédito não existe
campo nenhum.

- Passa a existir **um campo de valor sempre**, com o rótulo da forma escolhida
  ("Quanto entrou em PIX?", "Quanto o cliente deu em dinheiro?"...), já
  preenchido com o total a pagar.
- Em dinheiro, o troco continua aparecendo grande embaixo, como hoje.
- Nas outras formas, se o valor digitado for menor que o total, aparece o aviso
  de "falta R$ X" antes de fechar; se for maior, aviso de sobra.

## 2. Encaixar parte maior que o que falta

Hoje, faltando R$ 5 e digitando R$ 7, o sistema corta em silêncio e registra
R$ 5.

- O valor digitado é **respeitado**: encaixa R$ 7 e a conta passa a mostrar
  "sobra de R$ 2" no aviso vermelho que já existe, com o botão **Ajustar
  partes**.
- Ao confirmar com sobra, o aviso aparece antes de gravar (já existe essa
  confirmação — ela deixa de ser ignorada porque o valor não é mais cortado).
- O botão passa a dizer o valor real que vai ser encaixado.

## 3. Conta aberta: fechar pedindo confirmação e mostrando o que mudou

No modal de detalhes da conta:

- Cada alteração (aumentou, diminuiu, mudou preço, excluiu item) é registrada
  numa **lista de alterações da sessão**, com horário.
- Ao fechar o modal com alterações feitas, aparece uma confirmação listando
  tudo: "Bombom 2 → 4", "Casquinha removida", "Açaí R$ 12,00 → R$ 14,00", com o
  total antes e depois. Dá para **Fechar** ou **Voltar e revisar**.
- Sem alteração nenhuma, fecha direto como hoje.

## 4. Histórico com horário na conta

- Cada linha da conta passa a mostrar **a hora em que foi lançada** (e "editado
  às HH:MM" quando foi mexida depois).
- Um bloco **Histórico** no fim do modal lista, em ordem, o que aconteceu na
  conta: abertura, lançamentos e as alterações feitas nesta sessão, cada uma com
  horário.

## 5. Filtro fica aberto ao trocar de categoria

- Abrindo **Filtrar**, o painel de categorias **permanece aberto**; trocar de
  categoria não fecha mais nada, e a grade de produtos atualiza embaixo.
- Fecha só ao tocar em **Fechar**.
- Abrir o filtro já mostra o catálogo em **Todos**, em vez de tela vazia.

## 6. Sai o "Tela livre"

O bloco "Tela livre / Digite na busca para vender rápido..." é removido. Sem
categoria escolhida a área simplesmente fica limpa.

## Detalhes técnicos

- `src/components/pdv/modal-cobranca.tsx`:
  - `adicionarParte` deixa de fazer `Math.min(..., falta)` — o valor digitado
    entra inteiro; `excedente` já cobre o aviso e o `Ajustar partes`.
  - Fora do modo dividir, o bloco de valor recebido passa a renderizar para
    qualquer forma (não só `emDinheiro > 0`): `recebido` vira o valor pago na
    forma selecionada; troco só quando `pagamento === "cash"`. `confirmarComAviso`
    ganha o caso "recebido < aPagar" em forma não-dinheiro.
- `src/lib/vendas.functions.ts`: `listarComandas` passa a trazer
  `order_items(created_at, updated_at)` e `orders.opened_at` para o histórico.
- `src/components/pdv/comum.tsx`: `ComandaCard["itens"]` ganha `created_at` e
  `updated_at` opcionais.
- `src/components/pdv/modal-conta.tsx`: estado `alteracoes: {hora, texto}[]`
  alimentado por `mudarQtd`, `salvar` e `remover`; `fecharComResumo()` usa o
  `useConfirmar` da casa listando as alterações; bloco `Histórico` renderiza
  `opened_at` + `created_at`/`updated_at` dos itens + alterações da sessão,
  formatado em `HH:MM`.
- `src/components/pdv/grade-produtos.tsx`: o `onClick` das categorias não chama
  mais `setFiltroAberto(false)`; abrir o filtro com `aba === null` define
  `aba = "Todos"`; remoção do bloco "Tela livre".

## Ordem de entrega

1. Cobrança (campo de valor por forma + encaixe sem corte).
2. Modal da conta (confirmação ao fechar + histórico com horário).
3. Filtro persistente e remoção do "Tela livre".
