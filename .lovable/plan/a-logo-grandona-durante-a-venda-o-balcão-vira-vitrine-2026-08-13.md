# A logo grandona durante a venda — o balcão vira vitrine

A faixa em cima da busca foi a solução errada: espremida entre menu e busca, ela
nunca vai ficar grande. A logo precisa de uma **área própria**, que ninguém
disputa. Sua sugestão está certa e é a base do plano: o painel da direita passa
a abrir/fechar, e o espaço que ele libera vira a casa da marca.

## 1. Painel da direita vira gaveta (abre/recolhe)

- Botão fixo na borda direita ("Contas") com seta; clique desliza o painel para
  fora/dentro em 320 ms com curva suave.
- Recolhido, ele deixa só uma faixa fina com o número de contas abertas e o
  total — a informação crítica nunca some, só o volume.
- Estado lembrado no aparelho: cada caixa fica do jeito que trabalha.
- Atalho de teclado (Tab duplo não; usaremos `Ctrl+B`) e clique no rótulo.

## 2. Totem da marca — a logo GIGANTE fixa durante a venda

Com a gaveta recolhida, entra à direita a **coluna-totem**: fundo com o gradiente
da marca e a logo ocupando praticamente toda a largura da coluna (até ~320px de
largura, ~3x maior que hoje), fixa, sempre visível, virada para quem está do
outro lado do balcão. Embaixo, o nome da loja em letra de título.

- Com a gaveta **aberta**, a logo não some: ela vai para o topo do painel de
  contas, em tamanho médio (72px), com a mesma moldura — continuidade visual.
- No celular/tablet em pé, onde não cabe coluna: a logo vira uma **barra de
  marca fixa no rodapé** (altura 64px, sempre na tela), em vez da faixa que
  empurrava a busca.
- A faixa acima da busca é removida.

## 3. Marca d'água mais presente atrás dos produtos

Sobe de 6% para 9% de opacidade e de 62% para 80% da área, ancorada no centro da
grade. Ainda passa contraste de leitura dos cartões.

## 4. Modo vitrine (descanso) fica como está

Já funciona e você gostou. Só ganha o que faltava: **liga/desliga por caixa de
seleção no Admin com tempo escolhido (30s / 1min / 3min / nunca)** — o
liga/desliga já existe, o seletor de tempo entra agora, junto de uma prévia.

## Admin › Loja — cartão "Logo na tela de vendas"

- Chave: totem da marca durante a venda (ligado por padrão).
- Tamanho do totem: Grande / Gigante / Máximo.
- Chave: marca d'água atrás dos produtos + intensidade (Sutil / Média / Forte).
- Chave: modo vitrine + tempo de espera.
- Prévia ao vivo mostrando exatamente como o balcão fica.

## Neurociência aplicada

- **Área dedicada = zero competição atencional**: marca e tarefa deixam de
  disputar o mesmo eixo vertical, então a logo pode crescer sem custo de leitura.
- **Ângulo visual**: uma logo de ~300px é reconhecível a 4–5 m — é o que faz o
  cliente na fila "ver de longe".
- **Constância posicional**: aberta ou recolhida, a marca ocupa sempre o mesmo
  canto — reconhecimento em milissegundos.
- **Controle percebido**: a gaveta devolve à operadora o comando do espaço;
  interface que obedece reduz atrito e resistência de adoção.
- **Movimento único por vez** (320 ms, ease-out): o olho acompanha a origem do
  movimento e não perde o contexto do carrinho.

## Detalhes técnicos

- `src/components/app-shell.tsx`: `aside` ganha estado recolhido, largura
  animada (`w-80` ↔ `w-14`) e slot novo `marca` renderizado quando recolhido.
- `src/components/pdv/faixa-marca.tsx`: `FaixaMarca` é substituída por
  `TotemMarca` (coluna) e `BarraMarcaMobile`; `MarcaDagua` ganha nível de
  intensidade; `ModoVitrine` inalterado.
- `src/lib/config.ts`: `MarcaConfig` passa a `{ totem, tamanho, marcaDagua,
  intensidadeMarcaDagua, vitrine, vitrineSegundos }`, mantendo compatibilidade
  com as linhas já gravadas em `store_settings.marca`.
- `src/routes/_authenticated/vendas.tsx`: remove `FaixaMarca`, passa `marca` ao
  AppShell, mantém `MarcaDagua` e `ModoVitrine`.
- `src/components/admin/cartao-marca.tsx`: novos controles + prévia.
- Nenhuma alteração em venda, cobrança, recibo ou caixa.

## Ordem de entrega

1. Gaveta do painel direito (abrir/recolher + memória).
2. Totem da marca + barra de marca no celular; remoção da faixa.
3. Marca d'água com intensidade.
4. Admin: cartão completo com prévia e tempo da vitrine.
