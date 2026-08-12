# Cobrança segura: só entra quem a Kirvano confirmou

## Diagnóstico confirmado

- O primeiro login cria automaticamente uma assinatura `trialing` por 7 dias. Por isso uma conta confirmada entra sem pagar, mesmo sem existir qualquer evento da Kirvano.
- Para uma assinatura inexistente, a leitura também inventa uma cortesia de 7 dias, reforçando a liberação indevida.
- Não há evento da Kirvano salvo para os e-mails de teste consultados; portanto, a liberação observada veio da cortesia automática, não de pagamento.
- O erro `email rate limit exceeded` está nos logs do Supabase como limite de envio de confirmação, agravado por vários reenvios em sequência.
- O campo compartilhado de senha não força maiúsculas por CSS, mas não desativa explicitamente autocapitalização/correção do teclado móvel.

## 1. Regra de acesso sem brecha

- Remover totalmente a cortesia automática do cadastro e do primeiro login.
- Conta criada, mas sem pagamento confirmado, fica em estado **Aguardando pagamento** e não acessa Vendas, Caixa, Relatórios ou Admin.
- O layout autenticado fará primeiro a conciliação dos eventos e, em seguida, decidirá entre:
  - pagamento confirmado: abre o sistema;
  - sem confirmação: mostra uma tela limpa de ativação, com um único CTA para pagar e o botão **Já paguei — conferir agora**;
  - pagamento anterior vencido: mantém os 7 dias de tolerância já definidos, com os avisos e o bloqueio ao final.
- Nenhuma tela mostrará “assinatura ativa”, contagem verde ou data de renovação inventada antes da confirmação real.
- Assinaturas antigas em `trialing` sem evento confirmado também serão tratadas como não pagas, evitando que cadastros de teste continuem liberados.

## 2. Kirvano mensal, como solicitado

- Simplificar a regra para **plano mensal de R$ 39,90** por enquanto.
- Somente `SALE_APPROVED`, `SUBSCRIPTION_APPROVED` ou `SUBSCRIPTION_RENEWED` poderão ativar/renovar.
- Em cada confirmação mensal, usar a próxima cobrança enviada pela Kirvano; se ela não enviar a data, acrescentar 30 dias a partir da confirmação.
- Eventos recusados, carrinho abandonado, cadastro e confirmação de e-mail nunca liberam acesso.
- Manter o evento salvo para que um pagamento feito antes da criação/confirmação da conta seja conciliado no primeiro login.

## 3. Desativar confirmação de e-mail e acabar com o 429

Sim, pode ser desativada. Como este Supabase é conectado externamente, a alteração será feita no painel do projeto correto:

```text
Authentication > Providers > Email > Confirm email = desligado
```

Com isso, novos cadastros entram sem depender de e-mail e sem consumir o limite de mensagens de confirmação. O código continuará compatível caso a opção seja religada no futuro.

Também serão ajustados:

- mensagens amigáveis em português para limite de envio, sem exibir `email rate limit exceeded` cru;
- bloqueio temporário do botão de reenviar para impedir vários cliques seguidos;
- fluxo pós-cadastro direto ao checkout quando o Supabase devolver sessão imediata;
- confirmação de e-mail passa a confirmar apenas a identidade — nunca o pagamento.

## 4. Senha digitada corretamente no celular

- Configurar o campo de senha com `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}` e autocomplete adequado.
- Aplicar no componente compartilhado, corrigindo landing, Admin e demais telas que reutilizam o campo.
- Preservar exatamente os caracteres digitados; o botão de mostrar senha servirá para conferência visual antes de avançar.

## 5. Experiência visual orientada à decisão

- Tela de pagamento pendente com baixa carga cognitiva: status inequívoco, preço, uma ação principal e uma ação de conferência.
- Verde será reservado a pagamento realmente confirmado; âmbar para aguardando retorno; vermelho apenas para atraso/bloqueio.
- Feedback imediato ao conferir: “Pagamento confirmado — acesso liberado” ou “Ainda não recebemos a confirmação da Kirvano”.
- Sem pop-ups concorrentes, animações aleatórias ou urgência falsa; movimento apenas no estado de conferência e na transição de liberação.

## Validação

- Criar conta sem pagar e confirmar que nenhuma tela operacional abre.
- Simular evento recusado e confirmar que continua bloqueada.
- Simular pagamento aprovado e confirmar liberação mensal imediata.
- Simular renovação aprovada e confirmar nova data de +30 dias ou a data exata enviada pela Kirvano.
- Testar senha em teclado móvel sem capitalização automática.
- Verificar o cadastro com confirmação de e-mail desligada e o tratamento amigável do 429 caso a opção seja religada.