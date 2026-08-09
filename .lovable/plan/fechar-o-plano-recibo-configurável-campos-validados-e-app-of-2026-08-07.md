# Fechar o plano: recibo configurável, campos validados e app offline

As três frentes que faltaram entram nesta ordem, tudo numa leva.

## 1. Recibo 100% configurável no Admin

Nova aba **Recibo** no Admin, com o papel aparecendo ao lado enquanto você mexe
(pré-visualização ao vivo, usando o mesmo desenho que sai na impressora).

- **Papel**: 58mm, 80mm ou A4; letra pequena / normal / grande.
- **Logo**: mostrar ou não e tamanho (P/M/G).
- **Cabeçalho** (cada linha com chave liga/desliga): nome da loja, CNPJ,
  telefone, endereço, redes sociais e um texto livre.
- **Corpo**: nº do recibo, data e hora, nome da conta/mesa, operador, coluna de
  preço unitário, desconto, formas de pagamento, valor recebido e troco.
- **Rodapé**: mensagem livre com várias linhas, agradecimento, espaço para
  assinatura e quantas linhas em branco deixar no fim (corte da bobina).
- Botão **Imprimir teste** com uma venda de exemplo, para conferir na impressora
  antes de usar no cliente.

Fica salvo na loja (banco), então vale em qualquer aparelho e em qualquer
celular que abrir o sistema.

## 2. Admin — cada campo só aceita o que faz sentido

- Código do produto: só números.
- Preço, meta e valores: número com vírgula, nunca negativo, sem letras.
- Mesas, alerta e atraso: inteiro positivo.
- Telefone com máscara (00) 00000-0000; CNPJ com máscara e conferência do formato.
- Nome, categoria e tags: texto livre (aceita número), com limite de tamanho e
  sem repetidos nas listas.
- O aviso aparece embaixo do campo na hora, e o botão salvar fica travado
  enquanto tiver erro — em vez de gravar torto.

## 3. App instalável e funcionando sem internet

- Vira app de tela inicial no Android e no iPhone: ícone, tela cheia, sem barra
  do navegador.
- Abre sem sinal: produtos, configuração da loja e comandas abertas ficam
  guardados no aparelho.
- **Venda offline de verdade**: lançar itens, fechar conta, imprimir recibo e
  lançar saída sem internet. Uma faixa no topo mostra "sem internet — X vendas
  esperando" e, quando a conexão volta, tudo sobe sozinho na ordem certa.
- Cada operação tem um número próprio gerado no aparelho, então reenviar não
  duplica venda.
- Ajustes de toque: alvos maiores no PDV, teclado numérico nos campos de valor e
  a lista de produtos rolando bem em tela pequena.

Aviso honesto: o modo offline só funciona no app publicado (não dentro do
editor), e enquanto está sem sinal a hora da venda é a hora do aparelho.

## Detalhes técnicos

- Migração: coluna `recibo_config jsonb not null default '{}'` em
  `store_settings`; mapeada em `src/lib/config.ts` (`configDaLinha` /
  `linhaDaConfig`) com um tipo `ReciboConfig` e valores padrão iguais ao recibo
  atual, para nada mudar de aparência sem a dona mexer.
- `src/components/recibo/recibo.tsx`: `FolhaRecibo` passa a ler `ReciboConfig`
  (largura em mm, escala de fonte, chaves de exibição, linhas em branco finais).
  O mesmo componente é reaproveitado como preview no Admin.
- Novo `src/components/admin/aba-recibo.tsx` para o Admin não crescer mais.
- `src/lib/campos.ts`: `somenteDigitos`, `moeda`, `mascaraTelefone`,
  `mascaraCnpj`, `inteiroPositivo` + esquemas `zod` por formulário no Admin.
- PWA: `vite-plugin-pwa` com `generateSW`, `injectRegister: null`,
  `devOptions.enabled: false`, `registerType: "autoUpdate"`, `NetworkFirst` para
  navegação e `CacheFirst` só para assets com hash. Registro num único módulo
  guardado, que recusa em dev, iframe, `id-preview--*`/`preview--*`,
  `*.lovableproject.com` e com `?sw=off` (e desregistra nesses casos).
  Manifesto e ícones em `public/`.
- Offline de escrita: fila em IndexedDB (`idb-keyval`) com um envelope por
  operação (abrir comanda, adicionar item, fechar venda, lançar saída), `uuid`
  gerado no cliente para as gravações serem idempotentes, e um sincronizador que
  reenvia em ordem ao voltar a conexão. Leituras usam o cache do TanStack Query
  persistido.

## Ordem de entrega

1. Migração `recibo_config` + recibo configurável e aba no Admin.
2. Validação dos campos.
3. PWA instalável + fila offline.
