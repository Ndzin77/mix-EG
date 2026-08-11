# Fotos, upload de logo e telas mais enxutas

Estudei o código atual (fases 2 a 6 já feitas): produtos vêm de `products` sem imagem, o logo do recibo é um asset fixo no código (`eg-mix-logo.png`), as categorias de saída são fixas em `saidas.functions.ts`, o filtro de dia usa `SeletorDia` (setas + `input date`) enquanto Relatórios usa o `SeletorPeriodo` estilo gerenciador de anúncios, o cadastro de produtos e os dados da loja são formulários fixos na página do Admin, o cronômetro só tem os dois controles de minutos (sem liga/desliga) e o histórico de vendas usa caixas de seleção.

## 1. Logo da loja (upload como principal)

- Bloco "Logo" no Admin: área grande para **arrastar ou escolher o arquivo** (principal), com pré-visualização, botão de trocar e de remover.
- Alternativa discreta abaixo: **colar o link** de uma imagem, para quem já tem a arte hospedada.
- O logo salvo passa a ser usado no recibo e no cabeçalho do app; se não houver, cai no logo atual.

## 2. Produtos com foto

- Cada produto ganha uma foto opcional, enviada no mesmo padrão do logo (upload principal, link como alternativa).
- Na tela de vendas os botões viram cartões com a foto no topo, nome e preço legíveis por cima; quem não tem foto mantém o cartão atual com uma inicial colorida, sem quebrar o layout.
- Produtos melhor organizados na venda: as categorias viram **abas horizontais** ("Todos", "Açaí", "Milkshake"…) em vez de tudo empilhado, com contador por categoria e ordenação por mais vendidos dentro da categoria.

## 3. Categorias de saída personalizáveis

- As categorias deixam de ser fixas: bloco no Admin para **adicionar, renomear, reordenar e desativar** categorias de saída.
- A loja pode ficar com uma só, ou nenhuma (aí o lançamento fica só descrição + valor).
- Lançamentos antigos continuam mostrando a categoria com que foram gravados, mesmo se ela for removida da lista.

## 4. Filtro de data igual ao de Relatórios

O seletor de período de Relatórios (atalhos Hoje / Ontem / 7 dias / Este mês + intervalo livre) passa a ser **o filtro de todas as telas**: Saídas, Caixa e Relatórios. Caixa e Saídas continuam podendo trabalhar num único dia — o atalho "Hoje"/"Ontem" já faz isso —, mas agora aceitam também uma semana ou um mês.

## 5. Admin em modais

- Cadastro de produto: a lista fica limpa e o botão **"Novo produto"** abre um modal com o formulário; tocar no lápis abre o mesmo modal já preenchido.
- Dados da loja, recibo, meta do dia, salão e categorias: cada bloco vira um cartão-resumo com o valor atual e um toque abre o modal de edição.
- Resultado: o Admin cabe numa tela sem rolagem longa.

## 6. Cronômetro com liga/desliga

Chave "Usar cronômetro nas comandas" no Admin. Desligada, os minutos e as cores de atenção/atraso desaparecem das comandas (fica só o horário de abertura) e os controles de minutos ficam recolhidos.

## 7. Histórico de vendas: abrir e fechar

Saem as caixas de seleção. A seção inteira vira um bloco **recolhível** (fechado por padrão) e, aberta, tem rolagem interna própria. Cada linha também abre e fecha para mostrar os itens da venda e o botão de recibo, no mesmo estilo das contas abertas do PDV.

## Detalhes técnicos

- **Banco (uma migração):** `products.image_url text`, `store_settings.categorias_saida text[] default` com as cinco atuais e `store_settings.cronometro_ativo boolean default true`; `store_settings.logo_url` já existe. Um bucket de Storage `loja` (público, para o recibo e o balcão carregarem a imagem direto) com políticas de escrita restritas à empresa do usuário — caminho `{tenant_id}/produtos/...` e `{tenant_id}/logo/...`.
- Novo componente `src/components/upload-imagem.tsx` (upload via `supabase.storage`, pré-visualização, campo de link alternativo) reaproveitado por logo e produtos.
- `loja.functions.ts`: `lojaSchema` e `obterLoja` ganham `logo_url`, `categorias_saida`, `cronometro_ativo`; `produtoSchema` ganha `image_url`. `config.ts` ganha `logoUrl`, `categoriasSaida`, `cronometroAtivo` com os mapeamentos `configDaLinha`/`linhaDaConfig`.
- `saidas.functions.ts`: `category` deixa de ser `z.enum` e passa a ser texto validado contra as categorias da loja (aceitando vazio); a constante `categoriasSaida` fica só como padrão inicial.
- `SeletorPeriodo` + helpers de `relatorios.ts` passam a ser o filtro de `saidas.tsx` e `caixa.tsx`; `listarSaidas` e `resumoCaixa` passam a receber `{ de, ate }` em vez de `dia`. `seletor-dia.tsx` é removido depois de migrar os usos.
- `admin.tsx` é quebrado em `src/components/admin/*` (modal de produto, modal da loja, modal do recibo, modal de categorias, cartões-resumo) usando o `Dialog` do shadcn já presente.
- `grade-produtos.tsx` recebe as abas de categoria e a foto; `painel-lateral.tsx` e o cartão da comanda respeitam `cronometroAtivo`.
- `relatorios.tsx`: remove `marcadas`/`todosMarcados` e a barra de seleção, usa `Collapsible` para a seção e para cada venda. A exportação em planilha continua, agora do período inteiro.
- De quebra, corrijo o erro de hidratação da tela `/auth` que aparece hoje no console.

## Auditoria de encerramento

Subir um logo e conferir no recibo; cadastrar um produto com foto pelo modal e conferir o cartão no balcão; criar e apagar uma categoria de saída e lançar uma saída sem categoria; filtrar Saídas e Caixa por "7 dias"; desligar o cronômetro e conferir as comandas; abrir/fechar o histórico de vendas. Reporto o resultado antes de seguir.
