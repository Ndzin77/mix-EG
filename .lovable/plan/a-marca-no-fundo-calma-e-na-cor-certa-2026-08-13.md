# A marca no fundo, calma e na cor certa

Duas coisas: a marca d'água fica inteligente (se adapta à cor da logo, seja qual
for), e todo o movimento parasita do lado direito acaba.

## 1. Fim do que fica pulsando à direita

Nada mais respira, pisca ou pulsa no lado direito durante a venda:

- A logo do totem para de "respirar" (`logo-flutua`, laço infinito de 6 s). Ela
  entra uma vez com uma aparição suave e depois fica **parada**.
- A aba/seta da gaveta de contas perde qualquer brilho e animação contínua; vira
  um alvo estático que só reage ao passar o mouse e ao clique.
- O selo vermelho de assinatura sai do `animate-pulse` eterno: ganha um destaque
  fixo de alto contraste (número em vermelho sólido com anel), que chama sem
  latejar.
- Regra geral adotada: **nenhuma animação infinita fora do modo vitrine**.
  Movimento só como resposta a uma ação (entrada, abrir/fechar, toque).

Neurociência: movimento periférico contínuo sequestra atenção involuntária a
cada ciclo. Num balcão, isso vira cansaço e erro de digitação. Contraste
estático informa igual, sem custo atencional.

## 2. Marca d'água inteligente — combina com qualquer logo

A logo é lida uma vez no navegador (canvas, em memória) e dela sai a **cor
dominante** e se ela é clara ou escura. Essa cor vira variáveis de tema usadas
pelo fundo do balcão:

- Halo radial atrás da grade de produtos na cor da logo (bem diluído), no lugar
  do gradiente rosa fixo.
- Totem e modo vitrine passam a usar o mesmo par de cores extraídas — qualquer
  loja que troque a logo ganha um balcão que combina, sem mexer em nada.
- Opacidade da marca d'água calculada, não fixa: logo clara sobre fundo claro
  recebe mais opacidade; logo escura, menos. Os três níveis do Admin (Sutil /
  Média / Forte) viram multiplicadores dessa base, então "Forte" nunca chega a
  prejudicar a leitura dos cartões.
- A marca d'água ganha máscara suave nas bordas (fade radial), para parecer
  parte do papel de fundo e não uma figura colada.
- Se a leitura da cor falhar (logo remota sem permissão), cai no tema atual —
  nada quebra.

Neurociência: cor de marca no plano de fundo cria familiaridade sem competir
com a figura (produto/preço). Manter o contraste da figura acima de um limite
fixo garante que a leitura continua rápida.

## 3. Admin

O cartão "Logo na tela de vendas" ganha:

- Prévia mostrando a cor extraída da logo e como fica o fundo.
- Chave "Combinar cores com a logo" (ligada por padrão) — desligando, volta ao
  tema rosa da casa.
- Os controles existentes (totem, tamanho, intensidade, vitrine, tempo) seguem
  iguais.

## Detalhes técnicos

- Novo `src/lib/cor-da-logo.ts`: hook que carrega a imagem em `<canvas>`,
  amostra pixels ignorando transparência e quase-branco, devolve
  `{ cor, claro, contraste }` em oklch, com cache por URL.
- `src/components/pdv/faixa-marca.tsx`: `MarcaDagua` usa opacidade calculada +
  `mask-image` radial; `TotemMarca` perde `logo-flutua` e usa gradiente derivado
  da cor; `ModoVitrine` mantém a animação (é a tela de descanso).
- `src/styles.css`: `logo-flutua` deixa de ser laço infinito; entra
  `--marca-cor` / `--marca-cor-suave` como variáveis definidas em runtime.
- `src/components/app-shell.tsx`: remove `animate-pulse` dos selos e da aba da
  gaveta.
- `src/components/admin/cartao-marca.tsx`: chave nova + prévia com a cor lida.
- Nada muda em venda, cobrança, recibo ou caixa.
