# Saídas com origem, cadeado por seção, fila de preparo e instalar o app

Quatro frentes numa leva só. Tudo em português, com o mesmo código de cores da casa (verde entra, vermelho sai, âmbar espera) e alvos grandes para o balcão.

## 1. Saídas — de onde o dinheiro saiu

Hoje a saída grava só descrição, valor e categoria. Passa a gravar também **a origem**: Dinheiro (gaveta), PIX, Débito, Crédito ou Outro.

- No formulário, uma faixa de 5 botões grandes com ícone e cor fixa (o mesmo desenho já usado na cobrança do PDV), atalhos de teclado 1–5. A última origem usada vem pré-selecionada — o cérebro não escolhe de novo o que já é rotina.
- A lista do dia mostra um selo de origem em cada linha, além da categoria.
- **Caixa** ganha "Saídas por origem" e corrige o número mais importante do dia: *dinheiro esperado na gaveta = vendas em dinheiro − saídas em dinheiro* (hoje qualquer saída derruba a gaveta, mesmo quando foi paga no PIX da conta bancária).
- **Relatórios** e a planilha do contador ganham a coluna Origem; o bloco "Para onde foi o dinheiro" ganha a quebra por origem ao lado da quebra por categoria. ( OBS: SGESTÃO DO IDEALIZADOR AQUI nao precisa disso na planilha de reatorios, pode manter como esta atualmente )
- Saídas antigas, sem origem, aparecem como "Não informado" — nada some.

## 2. Admin — cadeado por seção

Novo cartão **Segurança** no Admin (ícone de cadeado, ocupa pouco espaço; abre em modal).

- Lista as quatro seções bloqueáveis — Saídas, Caixa, Relatórios, Admin — cada uma com uma chave liga/desliga e **senha própria**.
- Ligar pede: definir a senha (mínimo 4 caracteres, confirmar), com opção "usar a senha de login" para quem não quer decorar mais nada.
- Só dono/gerente configura. Existe "senha mestra do dono": se alguém esquecer a senha de uma seção, o dono destrava pela senha de login.
- Ao ligar Admin, o próprio Admin passa a pedir senha — aviso claro antes de confirmar, para ninguém se trancar do lado de fora.

Como se comporta no dia a dia:

- O ícone da seção no menu ganha um **cadeado pequeno**; seção destravada no momento mostra o cadeado aberto por alguns segundos e some.
- Ao entrar, a tela não aparece: um painel de senha ocupa o lugar (teclado numérico grande no celular, foco automático, Enter confirma, erro treme e limpa o campo). Nada da seção fica visível por trás — nem de relance.
- **Sai da seção, tranca de novo.** Trocar de menu e voltar pede a senha outra vez, mesmo logado. Recarregar a página também. É esse o pedido e é assim que fica.
- Três erros seguidos: espera de 30 segundos com contagem visível, para desestimular tentativa por força bruta.

Segurança de verdade: a senha nunca é comparada no navegador. Fica guardada como hash com sal no banco e a conferência acontece no servidor.

## 3. Vendas — Fila de Preparo (experimental, ligada no Admin)

O gargalo é o bilhete de papel entre o vendedor e o ajudante. O sistema já sabe tudo o que foi pedido — falta só mostrar para quem monta.

Como fica, quando a dona liga "Fila de Preparo (experimental)" no Admin:

- No PDV, ao anotar itens numa conta, cada item entra na fila com estado **A fazer**. Nada muda no jeito de vender: quem digita continua digitando igual.
- Nova tela **/preparo**, pensada para uma segunda tela, tablet ou celular do ajudante, em tela cheia e sem menu:
  - Cartões grandes em coluna, **o pedido mais antigo primeiro**, com nome da conta/mesa em destaque, foto de cada produto, quantidade em número grande e a observação de sabor quando houver.
  - **Cronômetro por pedido** com a mesma régua de cor da casa: cinza no começo, âmbar depois do tempo de alerta, vermelho pulsando quando atrasa (usa os minutos já configurados no Admin).
  - Dois toques resolvem: **Comecei** (cartão vira "Em preparo", entra o cronômetro de montagem) e **Pronto** (cartão sai com animação e um toque sonoro curto opcional).
  - Itens adicionados depois na mesma conta entram como cartão novo marcado "+ adicionado", em vez de bagunçar o cartão que o ajudante já está montando.
  - Barra fixa no topo: quantos a fazer, quantos em preparo e o tempo do mais antigo. Contagem grande, sem precisar contar cartão.
  - Atualiza sozinha em tempo real (sem F5) e funciona sem login extra: link de acesso gerado no Admin, com botão "copiar link" e QR code para abrir no celular do ajudante.
- De volta ao PDV: cada conta mostra um pontinho de estado — a fazer / em preparo / pronto — e a coluna de contas avisa **"Pedido pronto"** em verde, para o vendedor chamar o cliente sem ir até a cozinha.
- Botão **"Chamar cliente"** no cartão pronto, que registra a hora da entrega — é isso que depois vira o número "tempo médio do pedido" no relatório.

Por que assim: cartão único por pedido, ordem por antiguidade e cor por tempo eliminam a decisão de "o que faço agora"; o ajudante só olha o de cima. Papel some, pedido esquecido some, e o vendedor deixa de interromper a venda para perguntar se saiu.

Fica desligado por padrão. Ligando e desligando no Admin, o PDV volta exatamente ao que é hoje.

## 4. Instalar o app

Cartão **Instalar** no Admin e um botão discreto no cabeçalho quando o navegador permite:

- **No celular**: dispara o convite nativo de instalação no Android; no iPhone, um modal ilustrado com o passo a passo (Compartilhar → Adicionar à Tela de Início), porque a Apple não permite instalar por botão.
- **No computador**: mesmo convite nativo no Chrome/Edge, com instrução de fallback (ícone de instalar na barra de endereço).
- O botão some sozinho quando o app já está instalado.

## Auditoria antes de dizer que acabou

Lanço saída em dinheiro e outra em PIX e confiro que só a de dinheiro mexe na gaveta; ligo cadeado nas quatro seções, entro, saio, volto e confirmo que pede senha toda vez; abro a fila de preparo em outra aba, anoto uma conta no PDV e confiro o cartão aparecendo em segundos, com Comecei/Pronto refletindo no PDV; e testo o botão de instalar. Reporto o resultado com o que passou e o que não passou.

## Detalhes técnicos

- **Migração 1** — `expenses.origem` (enum `payment_method`, nulo permitido = "não informado"); `resumoCaixa` e `resumoPeriodo` passam a agregar por origem, e `dinheiroEsperado` desconta só `origem = 'cash'`.
- **Migração 2** — `store_settings.bloqueios jsonb` com `{ saidas: { ativo, hash, salt }, ... }`. Hash `sha-256(salt + senha)` calculado e conferido só no servidor; a coluna nunca chega ao cliente com o hash (server fn devolve apenas `{ secao: ativo }`). Novas server fns em `src/lib/seguranca.functions.ts`: `estadoBloqueios`, `definirBloqueio`, `conferirSenha` (com `.middleware([requireSupabaseAuth])`; definir exige gerente).
- Destrava vive em `sessionStorage` com carimbo de rota; um efeito no `AppShell` limpa a chave ao sair da seção, garantindo o "pede de novo ao voltar". Guarda renderizada em `src/components/bloqueio/guarda-secao.tsx`, envolvendo o conteúdo das quatro rotas.
- **Migração 3** — `order_items.prep_status` (`todo|doing|done`, default `todo`), `prep_started_at`, `prep_done_at`, `delivered_at`; índice por `tenant_id, prep_status`. Realtime do Supabase na tabela, com fallback de refetch a cada 5s.
- Rota `/preparo` fora do `_authenticated` visual (sem menu), autenticada por token de loja em `store_settings.preparo_token` conferido em server fn — o ajudante não precisa de conta.
- Flag `preparoAtivo` em `Config` (`store_settings.preparo_ativo`), no mesmo padrão de `salaoAtivo`.
- Instalação: hook `useInstalarApp` capturando `beforeinstallprompt`, detecção de iOS/standalone; nenhum service worker novo — o PWA atual já existe em `src/lib/pwa.ts`.
- Coluna Origem entra em `src/lib/exportar.ts` (planilha detalhada) e no bloco de saídas dos relatórios.