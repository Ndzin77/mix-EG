# O totem combinando com o balcão — e controles finos no Admin

Três frentes: a emenda entre totem e gaveta some, o totem ganha ajuste fino
(tamanho e opacidade contínuos) e o cartão do Admin vira um painel organizado.

## 1. Por que "não combina" hoje

O totem, a gaveta de contas e a grade são três blocos com fundos diferentes
(`bg-card` colorido / `bg-secondary/40` / branco) separados por duas bordas
duras (`border-l`). O olho lê três caixas coladas, não uma vitrine.

A gaveta fica — ela ficou boa. O que muda é a emenda:

- **Uma superfície só.** O totem e a aba recolhida da gaveta passam a dividir o
  mesmo fundo derivado da logo; a borda dura entre eles some e vira um degradê
  de 1px na cor da marca.
- **Aba vertical na cor da marca**, não em cinza: quando a gaveta está recolhida
  ela parece a moldura direita do totem, não um pedaço de outra tela.
- **Sombra interna suave** (vinheta) no encontro totem/grade, para o totem
  parecer profundidade e não colagem — figura (produtos) na frente, marca atrás.
- Com a gaveta aberta, o totem encolhe com a mesma curva de 300 ms da gaveta,
  sem salto de cor.

Neurociência: contorno duro cria fronteira de objeto e obriga o olho a
segmentar. Fundo contínuo + degradê suave faz o cérebro ler "um balcão" e
gastar atenção só nos produtos.

## 2. Totem com ajuste fino

- **Tamanho** deixa de ser três botões: vira controle contínuo de 50% a 100%
  da largura da coluna, com número visível.
- **Opacidade da logo do totem** ganha controle próprio (40% a 100%), separado
  da marca d'água — dá para deixar a marca imponente ou discreta sem mexer no
  resto.
- **Marca d'água** mantém os três níveis, agora também com ajuste fino no mesmo
  padrão de controle.

## 3. Vitrine com tempo escolhido

Além dos atalhos (30 s, 1 min, 3 min), campo próprio em minutos/segundos com
qualquer valor a partir de 15 s. "Nunca" continua desligando.

## 4. Admin reorganizado

O cartão "Logo na tela de vendas" vira um painel com três blocos nomeados, na
ordem em que a dona pensa:

```text
[ Totem ]        ligar • tamanho • opacidade
[ Fundo ]        marca d'água • intensidade • combinar cores
[ Vitrine ]      ligar • tempo
                                   ( prévia grudada, atualiza ao vivo )
```

A prévia sai da coluna e vira barra fixa no topo do cartão em telas grandes,
mostrando totem + gaveta + grade com todos os valores aplicados — inclusive a
emenda nova.

## Detalhes técnicos

- `src/lib/config.ts`: `MarcaConfig.tamanho` e `intensidade` passam a números
  (0–100), com migração dos valores antigos ("media"/"grande"/"gigante" e
  "sutil"/"media"/"forte") na leitura; novos campos `opacidadeTotem` e
  `vitrineSegundos` livre.
- `src/components/pdv/faixa-marca.tsx`: totem usa largura/opacidade por style,
  fundo compartilhado e vinheta; sem borda dura.
- `src/components/app-shell.tsx`: emenda totem↔gaveta — remove `border-l` entre
  eles, aba recolhida na cor da marca via variáveis de tema.
- `src/components/admin/cartao-marca.tsx`: reescrito em três blocos + prévia
  no topo, com um componente local de slider rotulado.
- Nada muda em venda, cobrança, recibo ou caixa.
