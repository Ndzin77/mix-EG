# Assinatura de verdade: webhook fixo, menu próprio e checkout ligado

Estudei o código novo. O que já existe: tabela `subscriptions` (migração de 09/08), leitura em `src/lib/assinatura.functions.ts`, modal de cobrança `AvisoAssinatura` no layout logado, cartão de assinatura dentro do Admin e um webhook em rota de aplicativo (`/api/public/kirvano`). O que falta é justamente o que você pediu: URL que não depende de domínio, menu próprio com detalhe, checkout ligado e a conta `eg@gmail.com` com o primeiro mês pago.

## 1. Webhook numa Edge Function (URL fixa para sempre)

Hoje o webhook é uma rota do próprio site, então trocar de domínio quebra a Kirvano. Ele passa a viver numa Edge Function do Supabase, cujo endereço nunca muda:

```text
https://<ref-do-projeto>.supabase.co/functions/v1/kirvano
```

- Mesma lógica de hoje, endurecida: confere o cabeçalho `security-token`, acha a loja pelo e-mail do comprador (perfil → assinatura), e grava `active` / `past_due` / `canceled` com o próximo vencimento.
- `verify_jwt = false` (a Kirvano não manda token de usuário) e gravação com service role.
- Idempotência: cada evento recebido é registrado; reenvio da Kirvano não duplica nem reverte estado mais novo.
- A rota antiga `/api/public/kirvano` continua respondendo por compatibilidade, apontando para a mesma lógica — quem já estiver configurado não quebra.

## 2. Menu "Assinatura" com detalhe

Assinatura sai de dentro do Admin e ganha item próprio no rail lateral (ícone de selo, com pontinho vermelho pulsando quando há atraso) e tela `/assinatura`:

- **Semáforo grande** no topo: cor antes do texto — verde "em dia", âmbar "vence em X dias", vermelho "atrasada há X dias".
- **Contagem regressiva** dos 7 dias de tolerância em 7 barrinhas (efeito de perda: a pessoa vê o recurso sumindo).
- Plano, valor, próxima cobrança, e-mail do comprador e data da última confirmação da Kirvano.
- **Histórico de eventos** (aprovado, renovado, atrasado, cancelado) em linha do tempo — encerra qualquer discussão de "eu paguei".
- Bloco de configuração da Kirvano: URL da função copiável em um toque, com selo "token configurado" e checklist dos eventos a marcar.
- Botão único e grande **Pagar / Regularizar** com o link do plano, já com e-mail e telefone preenchidos.

O cartão dentro do Admin fica como atalho curto ("ver assinatura"), sem duplicar conteúdo. O cadeado por senha continua valendo para essa área.

## 3. Checkout ligado ao seu plano

O link `https://pay.kirvano.com/dba076f9-32d8-4e3e-b0ce-d6ec34c27877` passa a ser o padrão do sistema (com variável de ambiente ainda podendo sobrescrever), usado em três lugares: cadastro da landing, modal de atraso e tela de assinatura. Sempre com `email`, `name` e `phone` pré-preenchidos — menos campos para digitar, mais gente concluindo.

## 4. A conta eg@gmail.com com o 1º mês pago

Assinatura dela fica: status **ativa**, plano **mensal**, valor R$ 39,90, próxima cobrança em 30 dias, marcada como primeiro mês quitado. Entra sem nenhum aviso de cobrança.

## 5. Neurociência aplicada (em tudo)

- **Cor antes de texto** e um número por bloco: o olho decide o estado em menos de um segundo.
- **Aversão à perda calibrada**: aviso dispensável até o 4º dia, insistente do 5º, tela única de regularização no 7º — sempre com a frase que reduz medo: "seus dados continuam guardados".
- **Micro-recompensa**: quando o pagamento é confirmado, a tela celebra (selo verde + confete curto) — fecha o ciclo de dopamina e reduz o arrependimento.
- **Ancoragem e prova** na landing: preço cheio riscado ao lado do promocional, contador de vagas da promoção, CTA fixo no rodapé no celular (thumb zone).
- **Progresso visível** no cadastro em 3 passos (já existente) com barra e um campo por vez — efeito de objetivo gradiente.
- **Fricção zero para copiar** a URL do webhook: um botão, confirmação verde imediata.

## Detalhes técnicos

- Nova Edge Function `supabase/functions/kirvano/index.ts` (CORS do SDK, validação com Zod, `verify_jwt = false` em `supabase/config.toml`), reusando a classificação de eventos de `src/routes/api/public/kirvano.ts`.
- Segredo `KIRVANO_WEBHOOK_TOKEN` pedido pelo formulário seguro na hora da implementação (mesmo valor colado na Kirvano). `KIRVANO_CHECKOUT_URL` deixa de ser obrigatório: o link do plano vira constante padrão.
- Migração: tabela `subscription_events` (tenant_id, event, payload, external_id único, created_at) com GRANTs, RLS de leitura por tenant e escrita só por service role; colunas `first_paid_at` e `last_seen_at` em `subscriptions`.
- Nova rota `src/routes/_authenticated/assinatura.tsx` + item no `nav` de `src/components/app-shell.tsx`; `assinatura.functions.ts` ganha leitura do histórico.
- Atualização de dados da conta `eg@gmail.com` via ferramenta de dados (não migração).
- Ponto a confirmar antes de gravar: o `.env` deste ambiente aponta para um projeto Supabase diferente do `supabase/config.toml`. Vou conferir qual é o projeto ativo antes de aplicar migração e função, para não criar coisa no banco errado.
