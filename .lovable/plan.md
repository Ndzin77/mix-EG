# Entrar na conta do cliente pelo Painel Mestre

Sim, é possível. No cartão de cada loja entra um botão **"Entrar como esta loja"**: você clica, o sistema abre a conta daquele cliente já logada, com todos os dados dele, sem pedir senha e sem você saber a senha dele.

## Como fica na prática

1. No painel `/mestre`, cada linha ganha a ação **Entrar como** (ícone de porta), ao lado de copiar e-mail.
2. Ao clicar, aparece uma confirmação curta: "Você vai abrir a loja EG Mix como dona da conta. Suas ações aparecem como se fossem dela." — porque entrar na conta é operar de verdade, não é só olhar.
3. Confirmando, o sistema entra e leva direto para Vendas, com uma **faixa fixa no topo** em cor de alerta: "Modo suporte — você está dentro da loja EG Mix · **Sair do modo suporte**".
4. O botão de sair encerra a sessão do cliente e devolve você ao painel mestre (o cookie mestre continua válido, então não precisa digitar a senha secreta de novo).
5. A faixa fica visível em todas as telas enquanto durar o suporte, para não haver risco de você lançar venda ou apagar coisa achando que é outra conta.

## Outras funções que fazem sentido no mesmo painel

Posso incluir agora ou deixar para depois, você decide:

- **Trocar a senha do cliente** (ele esqueceu e não recebe e-mail).
- **Enviar link de redefinição de senha** por e-mail.
- **Ver um resumo da loja** sem entrar: nº de produtos, vendas do mês, última venda — ajuda a diagnosticar "não aparece nada" antes de entrar.

## Legalidade e segurança

Acesso de suporte é prática normal de qualquer sistema por assinatura, desde que autorizado e rastreável. O plano já entrega as três proteções que sustentam isso:

- **Autorização por escrito**: uma cláusula curta de suporte técnico nos Termos de Uso, que o cliente aceita no cadastro ("a equipe pode acessar a conta para diagnóstico e correção, mediante solicitação ou aviso"). Sem isso, acesso não autorizado é crime (art. 154-A do Código Penal) e infração à LGPD.
- **Registro de auditoria**: toda entrada grava quem entrou, em qual loja, quando e por quanto tempo — e o cliente pode pedir esse histórico. É a sua prova de que o acesso foi de suporte.
- **Aviso na tela**: a faixa fixa deixa claro, para você e para quem estiver olhando, que é sessão de suporte.

Recomendação de uso: só entre quando o cliente pedir ajuda, e guarde a mensagem dele. Entrar por curiosidade, para ver faturamento ou alterar dados sem avisar, é o que sai da zona segura.

Do lado técnico:

- A entrada acontece **no servidor**, só depois de conferir o cookie de modo mestre; nada de senha do cliente no navegador.
- A sessão gerada é a do próprio cliente, respeitando as mesmas regras de acesso da loja — você não ganha poder extra dentro dela.
- Sair do modo suporte limpa a sessão do cliente para não sobrar login aberto no seu navegador.


## Detalhes técnicos

- Novo `entrarComoLoja` em `src/lib/mestre.functions.ts`: `exigirMestre()` → busca o e-mail em `profiles` pelo `tenant_id` → `supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email })` → devolve apenas `email` + `hashed_token` (nunca a senha nem o link completo).
- No cliente, o painel chama `supabase.auth.verifyOtp({ type: "magiclink", email, token_hash })`, o que cria a sessão do cliente no navegador; em seguida `navigate({ to: "/vendas" })` e `queryClient.clear()` para não misturar cache das duas contas.
- Marca do modo suporte em `sessionStorage` (`gestor:suporte` com nome da loja). Nova faixa `src/components/faixa-suporte.tsx` renderizada no layout `src/routes/_authenticated/route.tsx`, acima do `<Outlet />`, só quando a marca existe.
- Sair do suporte: `supabase.auth.signOut()` + limpar a marca + `queryClient.clear()` + `navigate({ to: "/mestre" })`. O cookie `gestor-mestre` não é tocado, então o painel reabre direto.
- Nenhuma migração de banco e nenhuma mudança de RLS. Se ativarmos "trocar senha", entra também `supabaseAdmin.auth.admin.updateUserById`.
- Auditoria: nova tabela `public.acessos_suporte` (tenant_id, email do cliente, iniciado_em, encerrado_em) gravada pelo servidor com `supabaseAdmin`, com RLS permitindo que a loja leia apenas os próprios registros. O painel mestre mostra o histórico de acessos de cada loja.
- Cláusula de suporte técnico exibida no cadastro e uma página própria de Termos de Uso (`/termos`), escrita como compromisso seu, não como texto gerado.
