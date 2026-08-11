# Otimizações: relatórios, recibo, admin e app offline

## 1. Relatórios — tudo aberto ao abrir a tela

Os blocos "Entrada × saída", "Produtos mais vendidos", "Como entrou o dinheiro" e
"Para onde foi o dinheiro" hoje nascem fechados. Passam a nascer **abertos**
(continuam podendo fechar com um toque, e o estado de cada um é lembrado no
aparelho).

## 2. Fechamento — rolagem e detalhe legível

- A lista de dias ganha rolagem própria de verdade, com o cabeçalho de colunas e a
  linha de TOTAL fixos (o total não some ao rolar).
- O detalhe de um dia (hoje um bloco confuso de duas tabelas cruas) vira duas
  seções claras, uma embaixo da outra em celular e lado a lado no computador:

```text
 ENTROU  R$ 1.514,00
 ─────────────────────────────
 4 ×  Sundae morango      120,00
 2 ×  Açaí 500ml           40,00
 ─────────────────────────────
 SAIU  R$ 10,00
 Insumos · leite            10,00
```

Com quantidade destacada, nome do produto sem cortar, valores alinhados à direita,
zebra nas linhas, e "nenhum item" quando vazio. Cada seção mostra seu subtotal
no topo, para a pessoa entender sem precisar somar.

## 3. Planilha do contador — colunas que fazem sentido

O CSV detalhado atual mistura venda e saída na mesma coluna e deixa campos vazios.
Vira uma planilha em que cada linha se explica:

`Data | Hora | Tipo | Conta | Produto/Descrição | Categoria | Qtd | Valor unitário | Valor total | Desconto | Pagamento`

- Venda: uma linha por item, com conta, hora e forma de pagamento preenchidas.
- Saída: uma linha, com categoria preenchida e sem quantidade.
- Valores como número (o Excel soma), data como data, e linha de TOTAL no fim.
- A opção "Resumida" (um dia por linha) continua igual.

## 4. Recibo totalmente configurável no Admin

Nova aba **Recibo** no Admin, com pré-visualização ao vivo do papel enquanto edita:

- Largura: 58mm, 80mm ou A4; tamanho da fonte (pequena/normal/grande).
- Logo: mostrar ou não, e tamanho.
- Cabeçalho: nome da loja, CNPJ, telefone, endereço, redes sociais e um texto livre —
  cada um com chave de mostrar/ocultar.
- Corpo: mostrar nº do recibo, data/hora, nome da conta/mesa, operador, coluna de
  preço unitário, desconto, formas de pagamento, valor recebido e troco.
- Rodapé: mensagem livre (várias linhas), texto de agradecimento, chave "espaço para
  assinatura" e linhas em branco no fim (para o corte da bobina).
- Botão "Imprimir teste" para conferir na impressora antes de usar no cliente.

As preferências ficam salvas na loja (banco), então valem em qualquer aparelho.

## 5. Admin — cada campo aceita só o que faz sentido

- Código do produto: só números.
- Preço / meta / valores: só número com vírgula, sem letras, nunca negativo.
- Quantidade de mesas, alerta e atraso: só inteiro positivo.
- Telefone: máscara (00) 00000-0000. CNPJ: máscara com validação de formato.
- Nome, categoria e tags: texto livre (aceita número), com limite de tamanho e sem
  duplicados nas listas.
- Aviso na hora, embaixo do campo, em vez de deixar salvar errado.

## 6. App no celular, instalável e funcionando offline

- Vira um app instalável (ícone na tela inicial, tela cheia, sem barra do navegador),
  em Android e iPhone.
- O app abre e funciona sem internet: produtos, configuração da loja e comandas
  abertas ficam guardados no aparelho.
- **Venda offline de verdade**: dá para lançar itens, fechar a conta, imprimir o
  recibo e lançar saída sem sinal. Fica uma faixa visível "sem internet — X vendas
  esperando" e, quando a conexão volta, tudo sobe sozinho para o banco, em ordem.
- Se a mesma comanda foi mexida em dois aparelhos offline, o sistema mantém as duas
  versões e mostra um aviso para você escolher, em vez de apagar movimento.
- Ajuste de toque para celular: alvos maiores no PDV, teclado numérico nos campos de
  valor e a lista de produtos rolando bem em tela pequena.

Aviso honesto: o modo offline só vale no app publicado (não dentro do editor), e o
relógio da venda usa a hora do aparelho enquanto está sem sinal.

## Detalhes técnicos

- `Sanfona` recebe `aberto` padrão `true` e passa a lembrar o estado em `localStorage`.
- `FechamentoDias`: contêiner com `max-h`/`overflow-y-auto` e cabeçalho/total `sticky`;
  o componente `Detalhe` é reescrito com layout em grade e subtotal próprio.
- `linhasDetalhe` em `src/lib/exportar.ts` reescrita; `fechamentoDiario` em
  `src/lib/relatorios.functions.ts` passa a devolver, por item, a conta, a hora, o
  unitário e a forma de pagamento.
- Migração: coluna `recibo_config jsonb` em `store_settings` (com default), mapeada em
  `src/lib/config.ts` (`configDaLinha`/`linhaDaConfig`); `FolhaRecibo` passa a ler todas
  as chaves; nova seção no Admin com preview reutilizando o próprio `FolhaRecibo`.
- Validação: helpers em `src/lib/campos.ts` (somenteDigitos, moeda, telefone, CNPJ) +
  esquemas `zod` por formulário no Admin.
- PWA: `vite-plugin-pwa` (`generateSW`, `injectRegister: null`, `devOptions` desligado)
  com registro guardado — nunca no editor/preview/iframe — e `NetworkFirst` para
  navegação; manifesto e ícones em `public/`.
- Offline de escrita: fila local em IndexedDB (`idb-keyval`) com envelope por operação
  (abrir comanda, adicionar item, fechar venda, lançar saída), IDs `uuid` gerados no
  cliente para as escritas serem idempotentes, e um sincronizador que reenvia em ordem
  ao voltar a conexão. As leituras usam cache do TanStack Query persistido.

## Ordem de entrega

1. Relatórios (blocos abertos, scroll, detalhe legível) e planilha do contador.
2. Recibo configurável + Admin (inclui a migração).
3. Validação dos campos.
4. PWA instalável + offline com fila de sincronização.
