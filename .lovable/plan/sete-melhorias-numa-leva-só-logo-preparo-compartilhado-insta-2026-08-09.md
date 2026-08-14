# Sete melhorias numa leva só: logo, preparo compartilhado, instalação, gráficos, bobina, cardápio e mobile

Estudei o código atual: `app-shell` usa a logo fixa do arquivo (não a que você cadastrou), a fila de preparo só existe dentro do login, o cartão de instalar explica em vez de instalar, os gráficos dos relatórios são barras feitas à mão, o cardápio do Admin mistura tudo num cartão só e os sabores só existem quando o preço muda. Tudo isso muda abaixo.

## 1. Sua logo no topo

O rail de menus passa a mostrar a logo cadastrada no Admin (com a marca de fábrica só como reserva, se ainda não houver upload). Ela ganha um brilho suave ao carregar e, no celular, aparece na barra de cima junto do nome da loja — âncora de identidade sempre no mesmo canto do olho.

## 2. Preparo: link para compartilhar, hora, número e arrastar

- **Link próprio**: no Admin, dentro do cartão da fila de preparo, um botão "Gerar link da bancada" cria um endereço público (`/bancada/<código>`), com botões de copiar, QR code para o celular do ajudante e "gerar novo código" (invalida o antigo).
- **Senha**: você define ali a senha dessa tela. Quem abre o link digita a senha uma vez naquele aparelho — sem login, sem conta.
- **Hora e ordem**: cada pedido mostra a hora de chegada (14:32) e um número grande de ordem (#1, #2, #3), que é o que o ajudante grita no balcão.
- **Arrastar para reordenar**: segurar e arrastar o cartão muda a fila; a nova ordem vale para todo mundo (inclusive na tela compartilhada). No celular, arrastar por toque com um "peso" visual: o cartão levanta, os vizinhos abrem espaço, e um leve tremor de confirmação ao soltar.
- Cronômetro, cores de atraso e etapas continuam como estão.

## 3. Instalar de verdade (não explicar)

O cartão vira um botão único e grande: quando o navegador permite (Android, Chrome/Edge no computador), o toque abre a instalação na hora e o cartão vira "Instalado ✓". No iPhone — onde nenhum site pode instalar sozinho, é limitação da Apple — o botão abre um passo a passo animado apontando para o botão Compartilhar, em vez do texto atual. Se já estiver instalado, o cartão some da tela.

## 4. Cada gráfico com a forma certa

- **Entrada × saída no período**: área/linha dupla suave, com tooltip mostrando o dia e os dois valores.
- **Formas de pagamento**: rosca com o total no meio e legenda com valor e porcentagem.
- **Produtos campeões**: barras horizontais ordenadas, o primeiro em destaque de cor.
- **Saídas por categoria**: barras horizontais em escala de vermelho por peso.
- **Fechamento por dia**: mini-gráfico de tendência ao lado do total.
Tudo com animação de entrada de 400 ms, cores dos tokens do sistema e leitura em 2 segundos.

## 5. Bobina: prévia viva

A configuração do recibo passa a ter a folha de verdade ao lado (papel real em 58 mm / 80 mm / A4, sombra e borda serrilhada), atualizando a cada clique. Some o "recibo" imaginário: você liga "mostrar CNPJ" e o CNPJ aparece no papel na mesma hora, com um destaque piscando na linha alterada. No celular a prévia vira uma aba fixa embaixo ("Ver papel"), para não empurrar as opções para fora da tela.

## 6. Admin: cardápio organizado e sabores sem mexer no preço

- O Admin ganha abas no topo (Cardápio · Loja · Recibo · Segurança · App), em vez de uma coluna longa.
- **Cardápio**: lista agrupada por categoria, com contador, busca, arrastar produto entre categorias e cartão de produto com foto, preço e selo de modo.
- **Sabores sem alterar o preço**: no produto de preço fixo aparece "Opções de sabor (mesmo preço)" — você digita os sabores (Morango, Chocolate…) e pronto. Na venda, tocar no produto abre uma escolha rápida de sabor e a linha vira "Açaí 300ml — Morango" pelo mesmo preço. Quem não usa sabores continua com o toque único de sempre.

## 7. Mobile

Barra superior com logo e nome, botões de 48 px para cima, carrinho como painel deslizante com puxador, modais que sobem do rodapé com "arrastar para fechar", campos numéricos com teclado grande e nada de texto cortado nas telas estreitas.

## Detalhes técnicos

Migração:
- `order_items.prep_ordem numeric` (posição na fila, padrão pela hora de criação).
- `store_settings.preparo_senha jsonb` (hash + sal, mesmo formato das travas); `preparo_token` já existe.
- `products.opcoes text[] default '{}'` (sabores de mesmo preço).

Código:
- `src/components/app-shell.tsx`: logo via `useImagem(config.logoUrl)`; header mobile.
- `src/lib/preparo.functions.ts`: `reordenarPreparo`, `gerarTokenPreparo`, `definirSenhaPreparo`.
- Rota pública `src/routes/bancada.$token.tsx` + server route `src/routes/api/public/preparo.ts` (valida token + senha via `supabaseAdmin` dentro do handler, retorna só nome do item, quantidade, conta, hora e etapa — sem valores).
- Reordenar com `@dnd-kit/core` + `@dnd-kit/sortable` (toque e mouse).
- `src/components/instalar-app.tsx`: botão real com `beforeinstallprompt`, detecção iOS/standalone.
- Relatórios com `recharts` (já disponível via `components/ui/chart`): novos componentes em `src/components/relatorios/`.
- `src/components/admin/cartao-recibo.tsx`: prévia lado a lado reaproveitando `recibo.tsx` em modo amostra.
- `admin.tsx` dividido em abas + `src/components/admin/cartao-cardapio.tsx`.
- `comum.tsx`/`modal-preco.tsx`: `opcoes` no produto → passo de escolha sem alterar preço; recibo, caixa e relatórios continuam recebendo nome, quantidade e valor como hoje.
