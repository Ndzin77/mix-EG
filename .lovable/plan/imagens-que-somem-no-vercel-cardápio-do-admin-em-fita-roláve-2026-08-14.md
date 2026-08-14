# Imagens que somem no Vercel + cardápio do Admin em fita rolável

Três frentes, numa leva só.

## 1. A logo do Gestor Pro (e a de fábrica) aparecendo fora do Lovable

O ícone quebrado no Vercel não é bug de layout: as duas logos do sistema
(`gestor-pro.png` e `eg-mix-logo.png`) hoje são carregadas por um endereço
interno do Lovable (`/__l5e/assets-v1/...`). Esse endereço só existe na
hospedagem do Lovable — no Vercel ele responde 404 e o navegador mostra o
quadradinho de imagem faltando. É por isso que acontece nas duas telas
(login/assinatura/painel mestre e o topo do app quando o usuário novo ainda
não subiu logo própria: nesse caso a tela cai na logo de fábrica, que também
está quebrada).

Correção: baixar as duas imagens para dentro do projeto e importá-las de forma
normal, para o próprio build empacotá-las. Aí funciona em qualquer domínio —
Lovable, Vercel ou domínio próprio.

Além disso:
- **Usuário novo sem logo**: em vez de cair na logo de outra loja, o topo mostra
  um monograma da própria loja (iniciais dentro de um selo na cor da marca) com
  entrada suave. Identidade imediata, zero imagem quebrada.
- Toda `<img>` de marca ganha um estado de falha silencioso: se por qualquer
  motivo não carregar, entra o monograma no lugar — nunca mais o ícone quebrado.
- Ícone do app (manifest) passa a apontar para um arquivo de fato existente.

## 2. Cardápio do Admin: categorias correndo na horizontal

Hoje a fita rolável ficou no bloco de *gerenciar categorias*, e a lista de
produtos continua empilhando um grupo embaixo do outro (rolagem infinita).
Inverte-se:

- No topo do Cardápio, uma **fita horizontal rolável** de categorias:
  “Todos” + cada categoria com a contagem de produtos, uma do lado da outra,
  arrastando com o dedo/trackpad, com sombra nas pontas indicando que há mais e
  encaixe (snap) ao soltar.
- A categoria ativa fica preenchida na cor primária (alvo grande, leitura
  instantânea); as demais em contorno.
- Abaixo, só os produtos daquela categoria, em grade com foto, preço e selo de
  modo — troca de categoria com transição rápida (fade + subida de 8 px,
  180 ms), sem salto de tela.
- Criar/renomear/remover categoria continua existindo, mas recolhido num bloco
  “Gerenciar categorias”, para não competir com o cadastro.

## 3. Acabamento (neurociência aplicada)

- **Lei de Fitts**: alvos de 44 px+ na fita e nos cartões de produto.
- **Carga cognitiva**: uma categoria por vez em vez de tudo empilhado; contagem
  numérica evita contar com o olho.
- **Efeito de posição serial**: “Todos” sempre na primeira posição, ação
  primária (Novo produto) fixa no canto de sempre.
- **Movimento com propósito**: entradas de 180–400 ms, nada de animação
  infinita ou pulsante (já removidas antes por cansaço visual).
- **Estados claros**: vazio de categoria com convite direto (“Nenhum produto
  aqui — cadastrar”), skeletons no lugar de tela branca.

## Detalhes técnicos

- Baixar os binários para `src/assets/gestor-pro.png` e
  `src/assets/eg-mix-logo.png`; trocar os imports de `*.asset.json` +
  `.url` por import direto do arquivo (Vite emite hash e serve do bundle) em
  `auth.tsx`, `mestre.tsx`, `assinatura.tsx`, `app-shell.tsx`,
  `recibo/recibo.tsx`, `pdv/faixa-marca.tsx`.
- `app-shell.tsx`: fallback deixa de ser a logo de fábrica quando existe
  `config.nomeLoja` — passa a um `<Monograma>` novo em
  `src/components/marca-fallback.tsx`, reaproveitado onde houver `onError`.
- `public/manifest.webmanifest` + `public/app-icon-512.png`: conferir/repor o
  ícone real.
- `src/routes/_authenticated/admin.tsx`: estado `catAtiva`, fita
  `overflow-x-auto snap-x` com máscara nas pontas, lista filtrada por
  `catAtiva`, bloco de gestão dentro de `<details>`; o agrupamento vertical
  atual é substituído pela grade filtrada.
- Nada de cor solta: tudo pelos tokens já existentes em `src/styles.css`.
