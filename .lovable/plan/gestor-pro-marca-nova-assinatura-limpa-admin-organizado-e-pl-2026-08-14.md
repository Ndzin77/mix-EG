# Gestor Pro: marca nova, assinatura limpa, Admin organizado e planilha com pagamentos

Cinco frentes numa leva só.

## 1. A marca Gestor Pro no sistema

- Subir a logo enviada como asset e usá-la onde hoje aparece a marca do produto (não a da loja cliente): tela de login/cadastro, tela de assinatura, painel mestre e ícone/manifest do app.
- Coroa rosa + grafite viram o par de destaque dessas telas, mantendo os tokens já existentes (nada de cor solta no componente).
- Entrada suave: a logo aparece com um leve "chega" (fade + subida curta), sem animação infinita.

## 2. Assinatura mais bonita e mais honesta

- **Fora "Configuração da Kirvano"**: o bloco de endereços de webhook, token e eventos deixa de existir para o cliente. Ele fica só no Painel Mestre (é ferramenta sua, não dele).
- O que sobra na tela do cliente, em ordem de leitura: anel de dias restantes → cartão do plano (valor, próxima cobrança) → "Já paguei — conferir agora" → histórico simples de pagamentos recebidos ("Pagamento aprovado · 12/08 14:20"), sem jargão de evento.
- **"Ver minha cobrança"** passa a abrir `https://app.kirvano.com` (painel de login do comprador) em nova aba. O botão de quem está atrasado continua indo ao checkout de pagamento.
- Acabamento: cartões com respiro maior, hierarquia por tamanho (dias em número gigante), estados em verde/âmbar/vermelho já usados no app.

## 3. Admin mais organizado

- **Cardápio**: a barra de categorias vira uma fita horizontal rolável (uma do lado da outra, com rolagem lateral no dedo/trackpad e sombras nas pontas indicando que há mais), em vez de empilhar.
- Cada categoria mostra a contagem de produtos; a ativa fica preenchida (alvo grande, leitura instantânea).
- A lista de produtos daquela categoria aparece abaixo em grade, e a gestão de categorias (renomear/remover/criar) fica num bloco recolhido, para não competir com o cadastro.

## 4. Novo produto: sabores com múltipla escolha

- Em "Sabores / opções (mesmo preço)" entra uma chave: **"Permitir escolher mais de um"**.
- Ligada, na hora da venda o caixa marca vários sabores em caixinhas (ex.: 3 bolinhas: morango + chocolate + creme) e o preço continua o mesmo do produto.
- Os sabores escolhidos ficam registrados no nome do item da comanda e saem no recibo e na planilha detalhada — que é justamente o detalhamento que a confeitaria quer.
- Desligada, segue como hoje: escolha única.

## 5. Planilha do contador com as formas de pagamento

- **Resumida**: ganha colunas por forma — Dinheiro, Pix, Débito, Crédito, Outros — por dia, além de Faturou/Saiu/Sobrou, com a linha TOTAL somando tudo.
- **Detalhada**: além das linhas item a item, um bloco final "Recebimentos por forma" com o valor de cada meio de pagamento no período.
- Os valores vêm do detalhamento real de `order_payments` (venda dividida entre pix e cartão entra certa em cada coluna), com o mesmo cálculo já usado no gráfico de formas.

## Detalhes técnicos

- Logo via `lovable-assets` (`src/assets/gestor-pro.png.asset.json`), importada como pointer JSON.
- `src/routes/_authenticated/assinatura.tsx`: remoção do componente `Kirvano` de configuração; histórico de eventos vira lista amigável; botão "em dia" aponta para `https://app.kirvano.com`.
- Painel mestre (`src/routes/mestre.tsx`) recebe o bloco de webhook/token/eventos que saiu da tela do cliente.
- `src/routes/_authenticated/admin.tsx`: fita de categorias rolável (`overflow-x-auto` + `snap-x`), bloco de gestão de categorias recolhível, chave `multiplo` no rascunho do produto.
- Persistência do "múltiplo": campo dentro do JSON `variants`/config do produto, sem migração de schema; a leitura no PDV (`modal-preco.tsx`) passa a renderizar checkboxes quando ligado.
- Relatórios: `fechamentoDiario` passa a devolver as formas por dia (reaproveitando `somarFormas` de `src/lib/pagamentos.ts`); `src/lib/exportar.ts` ganha as colunas e o bloco de recebimentos.
