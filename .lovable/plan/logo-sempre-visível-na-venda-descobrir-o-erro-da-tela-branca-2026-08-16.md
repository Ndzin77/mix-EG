# Logo sempre visível na venda + descobrir o erro da tela branca

## 1. A marca não some quando entram produtos

Hoje a marca d'água só aparece com o carrinho vazio: em `vendas.tsx` o
`<MarcaDagua />` está dentro do ramo "carrinho vazio". Assim que o primeiro item
entra, a logo sai da tela.

Mudanças:

- Tirar a marca d'água de dentro do ramo vazio e colocá-la como fundo fixo da
  coluna central, valendo com carrinho vazio **e** com itens na conta.
- Os itens do carrinho viram "cards de vidro": fundo translúcido com leve
  desfoque no lugar do `bg-card` sólido, borda suave — a logo aparece atrás sem
  prejudicar a leitura de nome, preço e quantidade.
- Os cartões de produto da grade recebem o mesmo tratamento translúcido, para a
  tela ficar coerente nos dois estados.
- Contraste protegido: o texto continua em cor sólida (`foreground`) e o cartão
  mantém opacidade suficiente para não competir com a leitura de preço.

## 2. Investigar o erro da cliente

A foto mostra a tela "Esta página não carregou" com o título da aba em
Relatórios/Vendas. Essa tela é o `errorComponent` do app (o texto no código está
em inglês; o navegador dela provavelmente traduziu automaticamente). O que ela
não mostra é **qual** erro aconteceu — por isso não dá para afirmar a causa
agora. Não é falta de internet: sem internet o app mostra a faixa amarela
"Sem internet" e continua funcionando.

Primeiro passo, portanto, é passar a enxergar o erro:

- A tela de erro passa a mostrar um bloco discreto "Detalhes" (recolhido) com a
  mensagem técnica e um botão "Copiar detalhes" — assim a cliente manda um print
  que diz o que houve.
- Registrar o erro no console com rota, horário e mensagem, e enviar para o
  relatório de erros já existente (`reportLovableError`) incluindo a rota atual.
- Botão "Tente novamente" passa a limpar o cache da consulta que falhou antes de
  recarregar, para não repetir a mesma falha guardada.

Suspeitas mais prováveis a verificar com esse detalhe em mãos (todas ainda não
confirmadas): sessão expirada durante o uso (o servidor devolve 401 e o loader
quebra em vez de mandar para o login), ou uma consulta de relatório falhando com
período grande.

Como reforço barato e seguro, independentemente da causa:

- Erro de autenticação (401) nas telas protegidas redireciona para `/auth` em vez
  de estourar a tela de erro.
- As telas pesadas (Relatórios, Caixa) mostram o aviso de erro dentro do painel
  (`AvisoErro`, que já existe) em vez de derrubar a página inteira.

## Detalhes técnicos

- `src/routes/_authenticated/vendas.tsx`: `<MarcaDagua />` sobe para o contêiner
  da coluna central; itens do carrinho passam a `bg-card/70 backdrop-blur-sm`.
- `src/components/pdv/grade-produtos.tsx`: cartões translúcidos no mesmo padrão.
- `src/routes/__root.tsx`: `ErrorComponent` com detalhes copiáveis, rota no
  relatório e texto em português.
- Tratamento de 401 no ponto onde o erro é lançado pelos server functions
  protegidos, sem mexer em regra de negócio.
