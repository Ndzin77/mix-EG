# Corrigir "tudo vazio" no Vercel

## O que está acontecendo

No Vercel você entra normalmente (o login é feito direto no navegador, com os dados
do Supabase já embutidos no código), mas **nenhuma leitura funciona**: produtos,
comandas, caixa e relatórios são buscados por funções que rodam no servidor, e
essas funções procuram a configuração da loja em variáveis de ambiente
(`SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`) que existem aqui dentro do Lovable e
**não existem na sua conta do Vercel**. Sem elas, cada busca falha em silêncio e a
tela desenha o estado vazio — exatamente o que você viu.

Observação honesta: isso é a causa confirmada no código; se ao aplicar a correção
ainda faltar dado, o passo seguinte é olhar a mensagem de erro que passará a
aparecer na tela (hoje ela é engolida).

## O que eu vou fazer

1. **Deixar de depender do ambiente do servidor.** As funções passam a usar a
   configuração já embutida no aplicativo quando o servidor não tiver as variáveis.
   Resultado: o mesmo código funciona no Lovable, no Vercel e em qualquer outro
   lugar, sem você configurar nada.
2. **Nunca mais falhar calado.** Quando uma busca der erro, a tela mostra um aviso
   vermelho com o motivo e um botão "tentar de novo", em vez de fingir que a loja
   está vazia. Vale para vendas, caixa, saídas, relatórios e admin.
3. **Ajuste do Vercel.** O projeto é hoje compilado para outro tipo de servidor;
   vou incluir a configuração de publicação para Vercel, para o lado servidor subir
   certo lá.
4. **Instruções curtas** de quais variáveis colocar no painel do Vercel, caso você
   prefira o caminho padrão (funciona com ou sem, depois do item 1).

## Detalhes técnicos

- Novo `src/integrations/supabase/env.server.ts`: resolve URL/chave com
  `process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL` (e idem para a
  chave publicável), lido dentro do handler.
- Novo `src/lib/auth-middleware.ts` espelhando `requireSupabaseAuth` (o arquivo
  gerado em `integrations/` não deve ser editado), usando o resolvedor acima e
  mantendo validação do bearer com `auth.getClaims`. Todos os `*.functions.ts`
  (`loja`, `vendas`, `saidas`, `relatorios`) passam a importar esse middleware.
- `vite.config.ts`: preset do nitro para `vercel` quando `process.env.VERCEL` está
  presente, mantendo cloudflare como padrão; adicionar `vercel.json` mínimo se o
  preset exigir.
- Erros visíveis: cada `useQuery` das telas ganha tratamento de `isError` com um
  componente compartilhado `AvisoErro` (mensagem + `refetch`), em vez de cair no
  estado vazio.
- Nada de service worker envolvido aqui: as leituras que falham são chamadas
  `/_serverFn/*`, já fora do cache.

Depois disso eu retomo o restante do polimento que ainda estiver na fila.
