Limpar o filtro e devolver o fundo real aos cards de produto

1. No `src/components/pdv/grade-produtos.tsx`, retirar o wrapper sticky com `bg-background` e `border` que cria a linha de separação quando o filtro abre. O botão "Filtrar" deve ficar sozinho, sem barra de fundo atrás dele.
2. Manter as abas de categoria, mas abri-las como uma fileira simples logo abaixo do botão, sem bordas horizontais extras que simulem uma linha.
3. Trocar o fundo dos cards de `bg-card` para `bg-background` (fundo normal da tela). Remover o degradê no placeholder de foto e deixar o ícone `IceCream` sobre o fundo real, sem "caixa" ao redor.
4. Verificar visualmente na rota `/vendas` que abrir o filtro não desenha nenhuma linha horizontal e que os cards ficam com a cara do fundo da página.