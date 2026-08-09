# Saídas, Caixa e Relatórios — tudo numa leva

Estudei o código atual (`saidas.tsx`, `caixa.tsx`, `relatorios.tsx`, `admin.tsx`, `config.ts`, `use-config-sync.ts`, `loja.functions.ts`, `auth-middleware.ts`). Achei a causa real do bug das categorias, e não é o banco.

## Por que a categoria de saída não fica salva

A ponte que grava as preferências no banco (`useSincronizarConfig`) só é montada na tela de **Vendas**. No Admin ela não existe, então apagar/criar categoria de saída grava **só no navegador** — some ao recarregar em outro aparelho. Correção: subir essa sincronização para o layout autenticado, valendo em todas as telas, e recarregar a lista da loja depois de gravar.

## SAÍDAS

1. **Categoria opcional**: nada é pré-selecionado; clicar de novo na categoria ativa desmarca. Sem categoria, a saída é gravada como "Sem categoria" (já suportado pelo banco).
2. **Lançar rápido**: a saída aparece na lista **na hora** (atualização otimista) e o campo já fica livre para o próximo lançamento; se o banco recusar, a linha volta com aviso.
3. **Lançamentos com rolagem própria**: a lista ganha altura limitada com scroll interno e cabeçalho fixo com contador, em vez de esticar a tela inteira.

## Lentidão geral do site

Duas causas, as duas atacadas:

- **Toda** chamada ao servidor revalida a sessão contra o Supabase antes de rodar. Passa a validar a sessão localmente e reaproveitar o resultado por alguns minutos.
- **Toda gravação** faz uma consulta extra para descobrir a loja do usuário. Esse dado passa a ser lembrado por requisição/usuário.
- Além disso: leitura instantânea do cache enquanto revalida ao fundo (nada de tela em branco ao trocar de aba).

## CAIXA — redesenho

Reorganizado por hierarquia de decisão, não por lista de números:

- **Linha 1 — o veredito**: um bloco grande "Sobrou" com barra entrou/saiu proporcional (o olho compara tamanho antes de ler dígito), verde/vermelho contínuo.
- **Linha 2 — a conferência física**: "Deve ter na gaveta" em destaque, com campo opcional "contei na gaveta" que mostra sobra/falta na hora — fecha a tarefa em vez de deixar cálculo mental.
- **Linha 3 — de onde veio**: dinheiro/PIX/débito/crédito como barras proporcionais com participação em %, não quatro caixinhas iguais.
- **Pendência primeiro**: contas abertas viram faixa âmbar no topo, com atalho para receber.
- Números animados, aparição escalonada, e agrupamento por proximidade (Gestalt) para reduzir varredura.

## Ícone de ajuda "i" em todo o sistema

Novo componente de dica: um `i` discreto ao lado do rótulo que abre o texto explicativo ao passar o mouse ou tocar. Todas as frases longas de apoio (ex.: "vendas em dinheiro menos as retiradas…") saem da tela e vão para dentro do `i` — em Caixa, Saídas, Relatórios e Admin.

## RELATÓRIOS

1. **Modos de semana lmebrando dentro ou fora do mes, decidido antes na opção, isso que decide se considera os dis da semana somente dentro do mes ou semanas dentro do ano** (as "bolinhas" que você pediu — botões redondos de escolha rápida, e a escolha fica lembrada):
  - **1 a 7**: blocos fixos do mês (1–7, 8–14, 15–21, 22–28, 29–fim).
  - **Semana do mês**: quebra num dia fixo (domingo, segunda ou sábado — você escolhe), com as pontas cortadas pelo mês.
  - **Semana do ano**: mesma quebra, mas a semana continua inteira mesmo atravessando dois meses.
   Cada modo repopula a lista de semanas dentro do seletor de período.
2. **Cabeçalho que não persegue**: o bloco "entrou / saiu / sobrou" deixa de ficar grudado por cima ao rolar.

## Detalhes técnicos

- `src/routes/_authenticated/route.tsx`: chamar `useSincronizarConfig()` no layout; remover a chamada duplicada de `index.tsx`.
- `src/lib/config.ts`: `salvarConfig` passa a invalidar a query `loja` via persistidor.
- `src/routes/_authenticated/saidas.tsx`: `cat` inicia `""`, toggle nas chips, remoção do `useEffect` que auto-seleciona, `onMutate` otimista em `criar`, lista em `max-h-[26rem] overflow-y-auto`.
- `src/lib/saidas.functions.ts`: `category` nulo aceito e normalizado na leitura.
- `src/lib/auth-middleware.ts`: verificação local do JWT + cache curto (`Map` com TTL) de claims e de `tenant_id`; helper `tenantDoUsuario(context)` reutilizado em `saidas/vendas/loja.functions`.
- `src/router.tsx`: `defaultOptions.queries` com `staleTime` e `placeholderData: keepPreviousData`.
- Novo `src/components/dica.tsx` (Popover/Tooltip shadcn) usado nas telas citadas.
- `src/lib/relatorios.ts`: `semanasDoMes(ano, mes, modo, inicioSemana)` + `semanasDoAno(...)`; tipo `ModoSemana` salvo em `Config` (campo novo só no navegador, sem migração).
- `src/components/periodo/seletor-periodo.tsx`: seletor de modo de semana acima da lista de semanas.
- `src/routes/_authenticated/relatorios.tsx`: remover `sticky top-0 z-20` do bloco de resumo.
- `src/routes/_authenticated/caixa.tsx`: reescrita da tela conforme acima.
- Sem migração de banco.