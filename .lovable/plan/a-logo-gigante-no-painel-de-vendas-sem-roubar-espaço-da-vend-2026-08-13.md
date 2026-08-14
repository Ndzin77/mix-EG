# A logo gigante no painel de vendas — sem roubar espaço da venda

Hoje a logo aparece só como bolinha de 48px no menu lateral e 32px no celular. A
cliente quer a marca **grande de verdade**. O problema real: o PDV é uma tela de
trabalho densa — uma logo enorme fixa empurraria a busca e os produtos para
baixo e atrapalharia a venda. A solução são três momentos, cada um no tempo
certo do olho.

## 1. Faixa de marca no topo do painel de vendas

Acima da busca entra uma faixa da loja com a logo em tamanho grande (128px no
computador, 72px no celular), nome da loja em letra de título ao lado e, à
direita, o resumo do dia (total vendido + contas abertas).

- A faixa **encolhe sozinha** quando você começa a rolar ou digita na busca: a
  logo desliza para 40px e a barra vira uma linha fina. Ao limpar a busca, volta.
  (Foco no trabalho quando é hora de trabalhar; marca quando é hora de respirar.)
- Botão "recolher marca" para quem quer a tela toda de produtos.

## 2. Modo vitrine — a logo GIGANTE quando o balcão está parado

Depois de 60 segundos sem toque nenhum, a tela de vendas entra em **modo
vitrine**: fundo escurece suavemente e a logo aparece ocupando quase a tela
inteira, com respiração lenta (leve zoom que sobe e desce), brilho passando por
cima, nome da loja embaixo e o relógio + total do dia discretos no canto.
Qualquer toque, clique ou tecla volta ao PDV exatamente onde estava, sem perder
nada digitado.

Isso entrega o "muito grande mesmo" que a cliente pediu, funciona como vitrine
para o cliente que está no balcão, e não custa um pixel do fluxo de venda.

- Ligar/desligar e tempo de espera (30s / 1min / 3min / nunca) no Admin.
- Nunca entra em vitrine com carrinho aberto, modal aberto ou conta em cobrança.

## 3. Marca d'água atrás dos produtos

A logo em versão bem grande e translúcida (6% de opacidade) atrás da grade de
produtos, fixa no canto. Presença de marca constante, zero prejuízo de leitura —
os cartões continuam com o mesmo contraste de hoje.

## Controles no Admin (aba Loja)

Um cartão novo "Marca na tela de vendas":
- Tamanho da logo na faixa: Média / Grande / Gigante.
- Chave para a marca d'água.
- Chave do modo vitrine + tempo.
- Prévia ao vivo ao lado, mostrando como fica.

## Neurociência aplicada

- **Ancoragem espacial**: a marca sempre no mesmo canto do olho — reconhecimento
  em milissegundos, sem custo de busca visual.
- **Hierarquia por movimento**: a faixa recolhe no momento da tarefa; o cérebro
  só recebe a marca quando não há carga cognitiva competindo.
- **Respiração lenta (4s por ciclo)** na vitrine: ritmo abaixo do batimento
  cardíaco de repouso, percebido como calma e sofisticação, não como propaganda.
- **Retorno sem penalidade**: sair da vitrine devolve o estado exato — nada de
  medo de "perder o que eu tava fazendo", o principal inibidor de uso.
- **Transições de 300–400 ms com curva suave**: rápidas o bastante para não
  irritar, lentas o bastante para o olho acompanhar a origem do movimento.

## Detalhes técnicos

- Migração: `store_settings.marca jsonb not null default '{}'` mapeado em
  `src/lib/config.ts` (`configDaLinha`/`linhaDaConfig`) com tipo `MarcaConfig`
  `{ tamanhoLogo, marcaDagua, vitrineAtiva, vitrineSegundos }` e padrões que
  reproduzem o visual atual, exceto a faixa nova.
- `src/components/pdv/faixa-marca.tsx`: faixa com logo via `useImagem(config.logoUrl)`
  e reserva `eg-mix-logo.png.asset.json`; estado compacto controlado por
  `scrollTop` do container de produtos e por `termo` da busca.
- `src/components/pdv/modo-vitrine.tsx`: overlay em portal, timer com
  `pointerdown`/`keydown`/`visibilitychange` para reset, bloqueado quando há
  modal aberto ou carrinho com itens; animação por keyframes em `src/styles.css`
  (`marca-respira`, `marca-brilho`), respeitando `prefers-reduced-motion`.
- `src/routes/_authenticated/vendas.tsx`: monta `FaixaMarca` acima da busca e
  `ModoVitrine` no fim; marca d'água como camada no wrapper da `GradeProdutos`.
- `src/routes/_authenticated/admin.tsx` + novo `src/components/admin/cartao-marca.tsx`
  para o Admin não crescer no arquivo principal.
- Tudo só de apresentação: nenhuma alteração em venda, cobrança, recibo ou caixa.

## Ordem de entrega

1. Migração `marca` + config.
2. Faixa de marca no painel de vendas (com recolher inteligente).
3. Modo vitrine + marca d'água.
4. Cartão no Admin com prévia.
