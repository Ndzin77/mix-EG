# Projeto em branco + GitHub

## O que será feito

1. Limpar a página inicial (`src/routes/index.tsx`) removendo o placeholder e deixando uma tela realmente em branco.
2. Verificar que a estrutura do projeto está mínima e limpa.
3. Explicar os passos para conectar este projeto ao GitHub através do editor Lovable.

## Detalhes técnicos

- Editar `src/routes/index.tsx` para remover o `<img>` de placeholder e o fundo manual (`#fcfbf8`), deixando apenas um container vazio com fundo do tema padrão (`bg-background`).
- Manter `src/routes/__root.tsx` e o design system base (`src/styles.css`) intactos, pois fazem parte da estrutura mínima do TanStack Start.
- Não adicionar componentes, rotas ou lógica extras — o objetivo é um projeto em branco.

## Conexão com GitHub

Após a limpeza, a conexão com GitHub é feita manualmente no editor Lovable (não existe ação automática via chat):

1. No editor Lovable, abra o menu **Plus (+)** no input de chat.
2. Vá em **GitHub** → **Connect project**.
3. Autorize o app Lovable no GitHub.
4. Escolha a conta/organização onde o repositório será criado.
5. Clique em **Create Repository** no Lovable.

A partir daí o sync é bidirecional: alterações no Lovable sobem para o GitHub e alterações no GitHub sincronizam de volta.
