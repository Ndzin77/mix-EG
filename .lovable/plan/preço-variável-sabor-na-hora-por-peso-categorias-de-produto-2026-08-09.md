# Preço variável (sabor, na hora, por peso) + categorias de produto organizadas

Hoje todo produto tem um preço fixo e a categoria é digitada solta dentro do formulário do produto. Este plano cria três modos de preço, o fluxo de venda correspondente e uma área própria para categorias — tudo em modais grandes, com um passo por tela, para quem não é técnico não errar.

## 1. Modos de preço no cadastro do produto

No modal de produto entra um seletor visual "Como é o preço deste produto?" com quatro cartões (ícone + frase curta, um só selecionável):

- **Preço fixo** — como é hoje. Campo Preço (R$).
- **Preço por sabor** — abre uma lista de sabores dentro do próprio produto: nome + preço, botão "Adicionar sabor", lixeira com confirmação. Ex.: Açaí 300ml → Tradicional R$ 12,00 / Premium R$ 15,00.
- **Preço definido na hora** — sem campo de preço; opcionalmente um "preço sugerido" que já vem preenchido na venda.
- **Vendido por peso** — campo "Preço por quilo (R$)". Na venda pede-se os gramas e o valor sai sozinho.

O campo de preço muda conforme o cartão escolhido (nada de campos inúteis na tela). Produtos já cadastrados continuam como "Preço fixo" sem nenhuma ação.

## 2. Como fica na tela de vendas

O toque no produto continua igual para preço fixo (entra direto no carrinho, zero cliques a mais). Nos outros modos abre um modal curto, com teclado numérico grande e o valor final em destaque antes de confirmar:

- **Por sabor**: botões grandes com sabor + preço; tocar já joga no carrinho. A linha aparece como "Açaí 300ml — Premium".
- **Na hora**: um campo de valor, notas rápidas de atalho e o total em tempo real.
- **Por peso**: campo em gramas; abaixo, em letra grande, "850 g × R$ 39,90/kg = R$ 33,92". Confirma e entra no carrinho como uma linha de valor fechado.

Detalhes que evitam conflito com o que já existe:
- No cartão do produto na grade, em vez de um preço mentiroso, aparece um selo: "por sabor", "preço na hora" ou "R$ X/kg".
- Cada linha de preço variável é uma linha própria do carrinho (duas pesagens diferentes não se somam); produtos de preço fixo continuam agrupando com +1 como hoje.
- O "+/−" da linha de peso ajusta a quantidade de embalagens daquela pesagem; tocar na linha reabre o modal para corrigir gramas ou valor.
- Recibo, comandas, caixa, relatórios e planilhas não mudam de formato: tudo continua chegando como nome, quantidade e valor unitário.

## 3. Categorias de produto com lugar próprio

- Novo cartão "Categorias do cardápio" no Admin, ao lado do de saídas: lista das categorias, campo para criar, renomear e excluir (com confirmação, avisando quantos produtos usam a categoria).
- No formulário do produto a categoria vira uma lista de escolha + botão "Nova categoria", que cria sem sair do modal.
- Renomear a categoria renomeia nos produtos que a usam, para as abas de vendas não quebrarem.

## 4. Acabamento visual

- Modais com uma pergunta por vez, botão de confirmar fixo no rodapé e valor final sempre grande e legível.
- Estados vazios que explicam o que fazer ("Nenhum sabor cadastrado — adicione o primeiro").
- Toda exclusão passa pela confirmação já existente do sistema.

## Detalhes técnicos

Migração:
- `products`: `pricing_mode text not null default 'fixed'` (`fixed | flavor | manual | weight`), `price_per_kg numeric not null default 0`, `variants jsonb not null default '[]'` (`[{nome, preco}]`).
- `store_settings`: `categorias_produto text[] not null default '{}'`.
- Sem GRANT novo (colunas em tabelas existentes); RLS já cobre.

Código:
- `src/lib/loja.functions.ts`: schema Zod dos novos campos em `salvarProduto`/`listarProdutos`; server fn para renomear/excluir categoria em lote.
- `src/routes/_authenticated/admin.tsx`: seletor de modo, editor de sabores, cartão de categorias.
- `src/components/pdv/comum.tsx`: `Produto` ganha `modo`, `precoKg`, `sabores`; `Linha` ganha `uid` e `rotulo` opcional (chave do carrinho passa de `id` para `uid`).
- Novo `src/components/pdv/modal-preco.tsx` (sabor / valor manual / peso).
- `grade-produtos.tsx`, `index.tsx` (busca, atalhos, `adicionar`, `alterar`, `remover`, `linhasParaBanco`) adaptados à chave `uid`.
- `order_items` já aceita `quantity` fracionária e `unit_price` livre — sem mudança em cobrança, recibo ou relatórios.
