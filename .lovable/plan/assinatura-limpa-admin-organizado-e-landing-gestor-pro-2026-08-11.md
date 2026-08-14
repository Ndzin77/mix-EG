# Assinatura limpa, Admin organizado e landing "GESTOR PRO"

Tudo numa leva só: seis frentes, sem quebrar o que já funciona.

## 1. Assinatura: só o que interessa a quem paga

Sai da tela do cliente todo o bloco técnico (URL de webhook, token, instruções da Kirvano,
"último aviso da Kirvano"). Isso é da sua operação, não dela.

A tela vira duas coisas:

- **Anel de contagem** grande no topo: um círculo que se esvazia mostrando quantos dias faltam
  para a próxima cobrança, com o número gigante no centro ("faltam 12 dias") e a data por
  extenso embaixo ("renova em 23 de agosto"). Verde tranquilo, âmbar nos últimos 3 dias,
  vermelho quando atrasa (com as 7 barrinhas de tolerância só nesse caso).
- **Cartão do plano**: plano, valor/mês, situação em uma palavra e o botão único
  ("Ver minha cobrança" quando em dia / "Regularizar agora" quando atrasa).

Nada de e-mail da compra, última confirmação nem histórico de eventos: informação que só gera
dúvida. Frase de segurança fica ("seus dados continuam guardados").

## 2. Admin: organização e ritmo

- **Cardápio deixa de ser coluna solitária**: a tela passa a ter abas no topo —
  **Cardápio · Loja · Recibo · Segurança** — cada uma abrindo só o seu conteúdo, sem rolagem
  infinita e sem coisas amontoadas à direita. Uma decisão por vez, carga mental menor.
- Animação padronizada: entrada suave por aba (uma só, curta), cartões com o mesmo raio,
  mesma borda e mesmo espaçamento — hoje há três estilos misturados.
- **Cartão de assinatura sai do Admin** (já existe o menu próprio).
- Em **Dados da loja**, o campo "Mensagem do recibo" sai — quem edita isso é o
  Personalizar recibo.

## 3. Senha do Admin: recuperação de verdade

Hoje, se você põe cadeado no Admin e esquece a senha, a chave-mestra (senha do login) só
existe dentro do próprio Admin — que está trancado. Na tela de senha do Admin passa a
aparecer **"Esqueci a senha desta tela"**: confirma a senha do login e ali mesmo você define
uma senha nova para o Admin. Só para o Admin, as outras seções continuam como estão.

## 4. Relatórios e Caixa sem "margem"

A linha `margem X%` sai do cartão Resultado (não é lucro, não calculamos isso). Fica
`X vendas · ticket R$ Y`. Nenhuma outra comparação é removida — entradas e saídas continuam
mostrando a variação contra o período anterior, que é informação real.

## 5. Landing "/" enxuta e não só sorveteria

- Nome passa a ser **GESTOR PRO** em toda a página (topo, textos, título e descrição da aba).
- Texto neutro de segmento: "para lanchonete, sorveteria, açaí, padaria, food truck e
  qualquer balcão que vende no dia".
- Menos informação: uma promessa forte, o preço, o botão e **três** benefícios (em vez de
  seis) — os que decidem: venda rápida, caixa fechando certo, funciona offline.
- Botão fixo no rodapé no celular (zona do polegar) e o mesmo cadastro em 3 passos.

## 6. Conta eg@gmail.com: teste de 10 minutos

Deixo a assinatura dela vencendo em 10 minutos a partir de agora, em cortesia — dá para você
ver o aviso aparecer e o bloqueio depois.

E o SQL para você reativar por 1 hora, colar no SQL Editor do Supabase:

```sql
update public.subscriptions s
set status = 'active',
    plan = 'mensal',
    price = 39.90,
    current_period_end = now() + interval '1 hour',
    buyer_email = 'eg@gmail.com',
    last_event = 'SALE_APPROVED',
    updated_at = now()
from public.profiles p
join auth.users u on u.id = p.id
where s.tenant_id = p.tenant_id
  and lower(u.email) = 'eg@gmail.com';
```

Para voltar ao teste de 10 minutos, troque `interval '1 hour'` por `interval '10 minutes'` e
`status` por `'trialing'`.

## Neurociência aplicada

- **Uma decisão por tela**: abas no Admin e anel único na Assinatura reduzem a carga de
  escolha (efeito de sobrecarga de opções).
- **Cor antes de número, número antes de texto**: o estado é lido em menos de um segundo.
- **Progresso circular** na renovação: forma fechada é percebida como controle, não ameaça —
  o oposto do alarme, que é reservado ao atraso.
- **Aversão à perda calibrada**: barrinhas de tolerância aparecem só quando há atraso real.
- **Redução de ruído** = confiança: cada campo removido (webhook, token, margem) é uma dúvida
  a menos que gera suporte.
- **Zona do polegar** na landing e no Admin mobile.

## Detalhes técnicos

- `src/routes/_authenticated/assinatura.tsx`: remove `Ligacao`/`Detalhes` técnicos, novo
  componente de anel (SVG com `stroke-dasharray`) usando `diasAteVencer`. `WEBHOOK_URL` e
  `rotuloEvento` continuam em `src/lib/assinatura.ts` para o webhook — só saem da UI.
- `src/routes/_authenticated/admin.tsx`: introduz estado de aba e move os blocos existentes
  (produtos/categorias, dados da loja, `CartaoRecibo`, `CartaoSeguranca`, instalar, bancada)
  para dentro das abas; remove `CartaoAssinatura` e o campo `receipt_footer` do modal de loja
  (o valor continua salvo por `loja.functions.ts`, editável no Personalizar recibo).
- `src/components/trava-secao.tsx`: prop opcional de recuperação; usa
  `confirmarSenhaLogin` (já existe) + `criarTrava` para regravar `config.bloqueios.admin`.
- `src/routes/_authenticated/relatorios.tsx`: remove `margem`.
- `src/routes/index.tsx`: renomeia para GESTOR PRO, corta benefícios e reescreve `head()`.
- Dados de `eg@gmail.com` via ferramenta de dados (não migração). Sem mudança de schema.
- Observação: `src/integrations/supabase/types.ts` voltou a ficar com o schema de outro
  projeto Supabase. Confiro antes de mexer no que depende de tipos e restauro se preciso.
