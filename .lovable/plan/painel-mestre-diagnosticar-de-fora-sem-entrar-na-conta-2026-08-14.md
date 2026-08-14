# Painel Mestre: diagnosticar de fora, sem entrar na conta

Fora a ideia de "entrar como a loja". No lugar dela, duas ferramentas que resolvem 90% dos chamados sem tocar na conta do cliente: **redefinir a senha** e o **Raio-X da loja**. Mais um punhado de controles novos para você mandar no painel usando menos o chat. Nada muda fora da tela `/mestre`.

## 1. Senha do cliente (dois caminhos)

Dentro do cartão de cada loja, uma seção "Acesso":

- **Definir senha agora** — você digita (ou gera uma forte com um clique), o sistema troca na hora e mostra a senha em letra grande com botão "Copiar" para você mandar no WhatsApp. Some da tela ao fechar.
- **Enviar link por e-mail** — o cliente recebe o link oficial de redefinição e escolhe a senha dele. Feedback: "Link enviado para eg@gmail.com".

Ambos exigem confirmação por deslize/segundo clique, porque trocar senha derruba o acesso atual.

## 2. Raio-X da loja (o diagnóstico de fora)

Botão de lupa em cada linha abre um modal com a saúde da loja em números grandes, cores fixas por significado:

- **Produtos**: ativos / inativos / com foto — mata o clássico "não aparece nada" (catálogo vazio ou tudo inativo).
- **Vendas**: hoje, 7 dias, 30 dias, ticket médio.
- **Última venda**: "há 3 dias" em destaque — se estiver velha, o cartão fica âmbar/vermelho sozinho.
- **Contas abertas** agora e **saídas** do mês.
- **Conta**: dono, e-mail, se o e-mail está confirmado, último login, data de criação, nº de usuários.
- **Assinatura**: dias restantes e último evento da Kirvano.

No rodapé, um **veredito em português**: "Catálogo vazio — o cliente ainda não cadastrou produtos" / "Tudo certo: vendeu hoje" / "Sem vender há 12 dias". É o que você lê antes de responder o cliente.

## 3. Novas funções de controle no painel

- **Barra de resumo da plataforma** no topo: lojas ativas, vencendo em 3 dias, bloqueadas e receita mensal recorrente — números grandes, clicáveis (viram filtro).
- **+30 dias em um toque** direto na linha, com **desfazer por 6 segundos** em vez de caixa de confirmação.
- **Ordenar** por: vence antes · última venda · mais recente · nome.
- **Anotação interna** por loja (só você vê): "cliente pediu prazo até dia 10".
- **Copiar ficha** do cliente (nome, e-mail, situação, vencimento) para colar no WhatsApp.
- **Exportar CSV** de todas as lojas.
- **Ações em lote**: selecionar várias lojas e liberar/bloquear de uma vez.

## Neurociência aplicada na tela

- **Semáforo constante**: verde = pago, âmbar = vencendo, vermelho = bloqueado — a mesma cor sempre significa a mesma coisa, então você decide pela cor antes de ler.
- **Número grande primeiro**: dias restantes e valores em fonte display; texto explicativo em cinza abaixo (hierarquia pré-atentiva).
- **Desfazer em vez de "tem certeza?"**: reduz fricção nas ações reversíveis; confirmação forte fica só onde é irreversível (senha, remover).
- **Movimento só como resposta**: `results-pop` na lista, `modal-in` nos modais, contagem animada nos números. Nada piscando sozinho.
- **Uma decisão por vez**: o cartão da loja mostra Acesso, Assinatura e Diagnóstico em blocos separados, com espaço, evitando erro por proximidade.
- **Perigo com atrito físico**: botões destrutivos ficam isolados, em vermelho, com confirmação separada.

## Detalhes técnicos

- `src/lib/mestre.functions.ts` ganha: `definirSenhaCliente` (`supabaseAdmin.auth.admin.updateUserById`), `enviarLinkSenha` (`generateLink` tipo `recovery` + `resetPasswordForEmail`), `resumoLoja` (contagens em `products`, `orders`, `order_items`, `expenses` + `auth.admin.getUserById` para último login/confirmação), `anotarLoja` e `lojasEmLote`. Todas atrás de `exigirMestre()` e com `supabaseAdmin` importado dentro do handler.
- `listarLojas` passa a devolver também `ultimaVenda`, `produtosAtivos` e `anotacao`, em consultas agregadas únicas (sem N+1), para alimentar ordenação e cor do cartão.
- Migração pequena: coluna `nota_mestre text` em `public.tenants` (sem política nova — só o `supabaseAdmin` escreve; RLS existente já não permite escrita do cliente).
- Componentes novos em `src/components/mestre/`: `raio-x.tsx`, `acesso-loja.tsx`, `resumo-plataforma.tsx`, `barra-lote.tsx`; `editor-loja.tsx` recebe as seções Acesso/Diagnóstico/Anotação. Reuso de `Modal`, `Confirmar`, `CampoSenha` e das animações de `src/styles.css`.
- `src/routes/mestre.tsx`: ordenação, seleção múltipla, desfazer com timer e CSV via o utilitário existente `src/lib/exportar.ts`.
- Sem impersonação, sem tabela de auditoria de acesso, sem página de termos, e nenhum arquivo fora de `/mestre` e das funções de servidor do mestre é alterado.
