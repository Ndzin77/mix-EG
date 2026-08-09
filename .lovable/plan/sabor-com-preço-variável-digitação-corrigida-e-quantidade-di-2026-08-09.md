# Sabor com preço variável, digitação corrigida e quantidade digitada na venda

Conferi o código atual: o plano anterior está aplicado por inteiro — os quatro modos de preço no Admin, o `modal-preco.tsx` (sabor / valor na hora / peso), o selo no cartão do produto, a chave `uid` no carrinho e o cartão de categorias do cardápio com renomear/excluir em lote. O que falta é o que você pediu agora.

## 1. Cada sabor pode ter seu próprio jeito de cobrar

Hoje o sabor só aceita um preço fixo. Cada sabor passa a poder ser:

- **Preço fixo** (padrão, como é hoje) — nada muda para quem já cadastrou.
- **Preço na hora** — o caixa digita o valor na venda.
- **Por peso** — o sabor tem preço por quilo e a venda pede os gramas.

Para não poluir a lista, cada linha de sabor ganha **um botão de ícone à esquerda** (etiqueta / lápis / balança). Tocar nele **alterna entre os três modos** e o campo da direita muda junto: "0,00" para fixo, "R$ /kg" para peso, e desaparece no "na hora" (vira o texto "valor digitado na venda", com opção de valor sugerido). Uma legenda curta embaixo da lista explica o que cada ícone significa.

Na venda: a tela de sabores continua igual, mas o sabor de preço fixo entra direto no carrinho, e o sabor "na hora" ou "por peso" abre o segundo passo (valor ou gramas) dentro do mesmo modal, com botão "Voltar aos sabores". A linha do carrinho sai como "Açaí 300 ml — Premium · 320 g".

## 2. Digitar o preço do sabor sem travar

O campo de preço do sabor hoje reconverte o número a cada tecla, então some vírgula, o cursor pula e não dá para digitar "12,50" naturalmente. O rascunho passa a guardar **o texto exato digitado** (mesma máscara já usada no preço do produto) e só converte para número na hora de salvar. Também: campo novo já nasce vazio (em vez de "0,00") e o foco vai direto para o nome ao adicionar um sabor.

## 3. Digitar a quantidade na tela de vendas

No carrinho, o número entre o "−" e o "+" vira campo digitável: toca, digita "12", Enter (ou sai do campo) e pronto. Aceita só número, mínimo 1, e apagar tudo + confirmar remove a linha com o "desfazer" já existente. Os botões "+/−" continuam funcionando igual para quem prefere tocar. Em linhas de peso o campo continua sendo a quantidade de embalagens daquela pesagem, como já é hoje.

## Detalhes técnicos

- Sem migração: `variants` é `jsonb`. Cada sabor passa a ser `{ nome, preco, modo?: "fixed" | "manual" | "weight", precoKg?: number }`; ausência de `modo` = fixo.
- `src/lib/loja.functions.ts`: `saborSchema` ganha `modo` (enum, default `fixed`) e `precoKg` (número, default 0).
- `src/components/pdv/comum.tsx`: tipo `Sabor` estendido com os mesmos campos.
- `src/routes/_authenticated/admin.tsx`: `Rascunho.sabores` passa a guardar `preco` e `precoKg` como **string** (texto digitado), convertidos com `numeroDeMoeda` só no `salvar`; botão de ícone que alterna o modo; legenda dos ícones.
- `src/components/pdv/modal-preco.tsx`: passo interno de sabor selecionado (`etapa: "sabores" | "valor" | "peso"`), reaproveitando os campos de valor e gramas já existentes; rótulo composto com o sabor.
- `src/routes/_authenticated/index.tsx`: input controlado de quantidade na linha do carrinho (estado local por linha, `inputMode="numeric"`, commit no blur/Enter) chamando um novo `definirQtd(uid, n)` ao lado do `alterar` atual.
