# Vendas mais limpa, gráfico de pizza e filtro por semana do mês

## 1. Vendas — a faixa das contas abertas

O "1 conta aberta · R$ 35,00" nasce escondido (só bolinhas no lugar do valor) com um
ícone de olho ao lado. Um toque revela, outro toque esconde de novo. Nada de mouse:
funciona igual no celular.

## 2. Vendas — atalhos de teclado

- **Ctrl+Enter para cobrar** e **Enter na busca** passam a ser conferidos de verdade na
  tela rodando; hoje o atalho de cobrar está declarado mas não abre o modal. A causa
  ainda não está confirmada, então o primeiro passo é reproduzir e corrigir na raiz
  (ordem dos ouvintes de teclado / foco no campo de busca).
- No botão **Cobrar** sai a dica "Ctrl Enter" — fica só o valor. O atalho continua
  existindo, só não polui o botão.
- No campo de busca, o selo "Enter" só aparece quando já há algo digitado (com resultado
  para escolher), não com o campo vazio.

## 3. Vendas — menos texto na tela

- A frase "Tem mesas na loja? Toque em Personalizar…" vira um **ícone de informação (i)**
  ao lado do título "Atalhos"; o texto aparece ao tocar.
- As etiquetas F1…F6 e o "passe o mouse para expandir" saem da vista principal.

## 4. Vendas — "Mais vendidos" e categorias recolhidos

- **Mais vendidos** vira uma linha fina ("Mais vendidos · 6 atalhos"): um toque abre os
  botões, outro fecha. Fechado por padrão, o que devolve altura para a grade e o carrinho.
- As **abas de categoria** da grade de produtos também recolhem: por padrão aparece só a
  categoria atual + "Filtrar"; ao abrir, a lista completa de categorias.
- Em ambos, a escolha da dona fica lembrada no aparelho (não volta a fechar toda hora).

## 5. Relatórios — "Como entrou o dinheiro" em pizza

O bloco vira um **gráfico de rosca (pizza) desenhado à mão em SVG**, sem biblioteca nova:
uma fatia por forma de pagamento com as cores do tema, total no centro e legenda ao lado
com valor e percentual. Ao passar/tocar numa fatia, ela se destaca. Os descontos seguem
como aviso embaixo.

## 6. Relatórios — o filtro de data do histórico saindo da tela

Confirmado: o cartão do histórico usa `overflow-hidden`, então a janelinha do seletor de
período é cortada e o "Hoje" fica inclicável. O seletor passa a abrir em camada flutuante
por cima (portal), sem ser recortado por nenhum cartão — vale para Vendas, Caixa, Saídas e
Relatórios de uma vez.

## 7. Todos os filtros — semanas dentro de "Este mês"

Ao escolher **Este mês** (ou **Mês passado**) aparece uma segunda fileira de atalhos com as
semanas do mês, quebradas como a dona pediu:

```text
Agosto/2026 — dia 1º caiu num sábado
Semana 1: 01/08 a 01/08   (do 1º até o primeiro sábado)
Semana 2: 02/08 a 08/08   (domingo a sábado)
Semana 3: 09/08 a 15/08
Semana 4: 16/08 a 22/08
Semana 5: 23/08 a 29/08
Semana 6: 30/08 a 31/08   (última quebra no fim do mês)
```

Cada botão mostra **o número da semana e as datas** ("Semana 2 · 02/08–08/08"), para não
ficar adivinhando. Semanas futuras aparecem apagadas. Escolher uma semana filtra tudo
igual a qualquer outro período, e o botão do topo passa a dizer "Semana 2 · 02/08–08/08".
Um botão "Mês inteiro" volta ao mês completo.

## Detalhes técnicos

- `src/lib/relatorios.ts`: novas funções puras `semanasDoMes(ano, mes)` (quebra domingo–
  sábado com bordas do mês), `semanaDoIntervalo()` e rótulo correspondente em
  `rotuloIntervalo`; `presetDoIntervalo` continua respondendo `mes`/`mesPassado` só no mês
  cheio.
- `src/components/periodo/seletor-periodo.tsx`: painel renderizado via
  `createPortal(document.body)` com posição calculada do botão (corrige o recorte), mais
  a coluna de semanas quando o preset ativo é `mes`/`mesPassado`. Fechamento por clique
  fora/Esc mantido.
- `src/components/relatorios/pizza-formas.tsx` (novo): rosca em SVG com `stroke-dasharray`,
  sem dependência nova; usada em `relatorios.tsx` dentro da mesma `Sanfona`.
- `src/routes/_authenticated/index.tsx`: `Mais vendidos` recolhido (estado + localStorage),
  remoção das dicas de tecla do botão Cobrar, e revisão do `keydown` global (ignorar
  campos de digitação, garantir Ctrl+Enter e Enter da busca).
- `src/components/pdv/painel-lateral.tsx`: valor mascarado com botão de olho
  (`aria-pressed`) e dica do salão atrás de um `i` com popover simples.
- `src/components/pdv/grade-produtos.tsx`: abas de categoria recolhíveis.
- Sem mudança de banco nem de funções de servidor.
- De quebra, corrijo o erro de hidratação que aparece hoje na tela `/auth`.
