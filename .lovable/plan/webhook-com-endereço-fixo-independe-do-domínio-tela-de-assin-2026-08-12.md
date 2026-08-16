# Webhook com endereço fixo (independe do domínio) + tela de assinatura que decide em 1 segundo

Estudei o código atual. O que existe hoje: o webhook da Kirvano é uma **rota do próprio site** (`/api/public/kirvano`), a tabela `kirvano_events` já guarda todo aviso recebido, `sincronizarConta` concilia pagamento feito antes da conta existir, e a trava de servidor (`assinatura-guard.ts`) já barra loja sem pagamento confirmado.

O problema é só o endereço: por ser uma rota do site, ele muda junto com o domínio — e a constante `WEBHOOK_URL` no código ainda aponta para um endereço de projeto antigo, que não existe mais. Daí o `NOT_FOUND`.

Respondendo direto: **não precisa mexer no banco.** Nenhuma tabela nova, nenhuma migração. É código e configuração.

## 1. Um endereço só, para sempre, em qualquer domínio  
  
mas deve verificar se enviar para esse linka i o webhook, se o supabase respoinde com a função coreta

O webhook passa a viver numa Edge Function do Supabase — o endereço fica atrelado ao banco, não ao site:

```text
https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano
```

É exatamente o endereço que o seu checkout já usa. Ou seja: **você não muda nada na Kirvano**. Pode trocar de domínio, usar dois domínios, publicar em outro lugar — a cobrança continua chegando.

- Mesma regra de hoje, sem invenção: confere o cabeçalho `security-token`, acha a loja pelo e-mail do comprador, guarda **todo** evento em `kirvano_events` (mesmo sem conta criada) e grava ativo / atrasado / cancelado.
- Reenvio da Kirvano não derruba quem está pago em dia (a proteção atual é mantida).
- A rota antiga `/api/public/kirvano` **continua funcionando** como segunda porta, para não quebrar nada que já esteja apontando para lá.
- A função abre sem token de usuário (`verify_jwt = false`) e grava com a chave de serviço — a segurança é o `security-token`, como a Kirvano manda.
- Depois de publicar a função eu **disparo um evento de teste** contra ela e mostro o resultado, em vez de dizer "deve funcionar".

## 2. A tela de Assinatura passa a mostrar o endereço certo

Hoje o endereço fica escondido numa constante desatualizada. Ele sobe para a tela de Assinatura, num bloco "Configuração da Kirvano":

- Endereço em uma linha, **botão único de copiar** com confirmação verde imediata (fricção zero, recompensa instantânea).
- Selo "token configurado" quando o segredo existe, e a lista curta dos eventos a marcar na Kirvano.
- Bloco discreto: quem já está em dia não precisa vê-lo aberto — ele só se abre ao toque.

## 3. Neurociência aplicada na decisão de pagar

Nas duas telas de dinheiro (Assinatura e "Aguardando pagamento"):

- **Cor antes de texto**: verde só quando a Kirvano confirmou; âmbar para aguardando; vermelho só para atraso real. Um estado por tela, sem semáforo ambíguo.
- **Um número grande por bloco** (dias para renovar, ou dias restantes de tolerância) — leitura em menos de um segundo.
- **Aversão à perda calibrada**: a tolerância vira 7 barrinhas que vão apagando; a frase "seus dados continuam guardados" acompanha sempre, porque medo trava pagamento em vez de acelerar.
- **Uma ação principal só** (botão grande de pagar, na zona do polegar no celular) e uma ação secundária discreta ("Já paguei — conferir agora"). Nada de pop-ups concorrentes.
- **Fecho de ciclo**: confirmação de pagamento celebra com selo verde e uma animação curta, depois entra direto no sistema — a recompensa marca o fim da tarefa.
- **Prova concreta**: linha do tempo dos eventos da Kirvano (aprovado, renovado, atrasado), que encerra qualquer dúvida de "eu paguei".

## Detalhes técnicos

- Nova `supabase/functions/kirvano/index.ts` (Deno, autocontida: valida com Zod, classifica o evento, grava com service role) + `[functions.kirvano] verify_jwt = false` em `supabase/config.toml`.
- A classificação de eventos e o cálculo da próxima cobrança são copiados de `src/routes/api/public/kirvano.ts` / `src/lib/assinatura.ts` — a rota do site continua existindo e responde igual.
- Segredo `KIRVANO_WEBHOOK_TOKEN` precisa existir também no Supabase (Edge Functions). Vou pedir o valor no formulário seguro na hora da implementação — é o mesmo que está colado na Kirvano.
- `src/lib/assinatura.ts`: `WEBHOOK_URL` passa a ser montada a partir do projeto Supabase (`VITE_SUPABASE_URL`), então nunca mais fica desatualizada.
- `src/routes/_authenticated/assinatura.tsx` e `src/components/ativar-assinatura.tsx`: bloco de configuração com copiar, semáforo, barrinhas de tolerância, linha do tempo e celebração na confirmação.
- Sem migração de banco. Sem alteração no checkout.