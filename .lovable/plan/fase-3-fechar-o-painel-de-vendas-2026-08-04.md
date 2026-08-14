# Fase 3 — Fechar o Painel de Vendas

O PDV já grava vendas reais, abre contas e recebe pagamento. Esta fase fecha os buracos que faltam para o balcão rodar um dia inteiro sem travar, e termina com auditoria.

## O que falta hoje (verificado no código)

- As preferências da loja (salão, termo "Mesa", quantidade de lugares, meta do dia, minutos de alerta) vivem só no navegador (`localStorage`). Trocar de tablet ou limpar o cache perde tudo — precisa virar dado da empresa no banco.
- A tela de vendas é um único arquivo de ~1.700 linhas. Isso já dificulta ajuste fino e vai piorar nas fases seguintes.
- Não existe desconto, nem pagamento dividido (parte no cartão, parte em dinheiro).
- Ao adicionar itens numa conta aberta, a gravação reescreve os itens do zero; se duas pessoas mexerem na mesma conta ao mesmo tempo, uma sobrescreve a outra.
- As contas abertas só atualizam quando a página refaz a consulta — em dois caixas ao mesmo tempo a lista fica velha.

## O que vou entregar

1. **Preferências da loja no banco**: salão ligado/desligado, nome do lugar, quantidade de lugares, atalhos de conta, meta do dia, minutos de alerta e atraso, e mensagem do recibo passam a ser salvos por empresa. Continuam editáveis no botão "Personalizar" do PDV e no Admin, mas agora seguem o login em qualquer aparelho.
2. **Desconto e pagamento dividido** na tela de cobrança: desconto em R$ ou %, e a opção de dividir o valor entre duas formas de pagamento, com o troco recalculado ao vivo.
3. **Contas abertas confiáveis**: adicionar itens passa a somar em vez de reescrever, e a lista de contas atualiza em tempo real entre caixas.
4. **Quebra da tela em partes**: carrinho, painel lateral, mapa do salão, grade de produtos e os pop-ups viram arquivos próprios. Mesma aparência, manutenção muito mais simples.
5. **Ajustes de leitura rápida** que ainda estão pendentes da auditoria: contraste checado, barra de atalhos visível no rodapé, teste em tablet 1024 px e estados vazios claros.

## Auditoria de encerramento

Antes de propor a Fase 4, rodo a checagem: login no usuário de teste, venda direta paga em dinheiro/PIX/cartão, conta aberta com adição de itens e recebimento posterior, cancelamento, desconto, pagamento dividido, e conferência de que o caixa do dia soma exatamente o que foi vendido. Reporto o resultado e só sigo com sua confirmação.

## Detalhes técnicos

- Migração: novas colunas em `store_settings` (`salao_ativo`, `termo_mesa`, `qtd_mesas`, `destinos`, `meta_diaria`, `alerta_min`, `atraso_min`, `caixa_privado`) com valores padrão; políticas atuais já cobrem leitura por empresa e escrita por gerente.
- `src/lib/config.ts` deixa de ser fonte de verdade e passa a hidratar a partir de `obterLoja`, com escrita via `salvarLoja` (React Query como cache, `localStorage` só como fallback offline).
- Nova server function `adicionarItens` (insert incremental + recálculo do total no servidor) para não reescrever `order_items`.
- Realtime via `supabase.channel` em `orders`/`order_items` dentro de `useEffect` com `removeChannel` no cleanup, invalidando as queries `comandas` e `caixa`.
- `src/routes/_authenticated/index.tsx` fica só com o orquestrador; componentes vão para `src/components/pdv/*`.
- Desconto entra como campo em `orders` (`discount`) e o pagamento dividido como um segundo par forma/valor, mantendo `payment_method` preenchido com a forma principal para não quebrar relatórios.
