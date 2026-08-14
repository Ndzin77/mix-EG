# MVP — Sistema de Gestão para Sorveteria (EG Mix)

Sistema de PDV + caixa + relatórios, construído em fases, com auditoria profunda ao fim de cada fase e confirmação sua antes de avançar.

## Identidade visual (diferencial "neurológico")

Baseada na logo: rosa vibrante (ação/venda), chocolate escuro (texto/estrutura), creme de waffle (fundos), verde menta (confirmação/lucro), vermelho morango (saídas/prejuízo).

Princípios de produtividade aplicados:
- Cor = significado fixo. Entrada sempre verde, saída sempre vermelha, pendente sempre âmbar. O operador aprende em 1 dia e nunca mais lê rótulo.
- Alvos grandes (mín. 56px) — a tela é usada com mão molhada/ocupada, muitas vezes em tablet.
- Zero-modal no fluxo de venda: tudo acontece numa tela só, sem popup bloqueando.
- Teclado primeiro: busca sempre focada, Enter adiciona, F2 finaliza, Esc limpa.
- Comandas pendentes sempre visíveis numa faixa lateral colorida — nunca escondidas em menu.

## Fases

### Fase 1 — Fundação visual e estrutura
- Design system completo (cores da marca em tokens, tipografia, componentes base).
- Logo no painel, layout com navegação: Vendas | Saídas | Relatórios | Admin.
- Telas navegáveis (ainda sem dados reais).
- Auditoria: contraste, responsividade tablet/desktop, consistência de tokens.

### Fase 2 — Backend e cadastro (Admin)
- Banco: produtos (nome, preço, código numérico, tags/apelidos, categoria), categorias, config da loja (nome, CNPJ, mensagem do recibo, logo).
- CRUD de produtos com busca. Tags permitem chamar o mesmo produto de vários jeitos.
- Auditoria: validações, dados de exemplo, regras de acesso.

### Fase 3 — Painel de Vendas (coração do sistema)
- Busca única que aceita nome, tag ou código numérico; Enter adiciona ao carrinho.
- Carrinho com quantidade, desconto por item, total ao vivo em destaque.
- Comandas em aberto: cliente pega, senta, não paga. Salva como comanda nomeada, fica na faixa lateral, pode reabrir e adicionar mais itens a qualquer momento.
- Finalização: seleção de pagamento (dinheiro, PIX, débito, crédito) com cálculo de troco.
- Auditoria: teste de fluxo completo, concorrência de comandas, totais.

### Fase 4 — Saídas e Caixa
- Registro de saída simples: descrição + valor + categoria.
- Fechamento de caixa do dia: total entradas por método, total saídas, resultado.
- Auditoria: conferência aritmética, fechamento com comandas abertas.

### Fase 5 — Relatórios e gráficos
- Períodos: diário, semanal, mensal, personalizado.
- Tabela Entrada | Saída | Resultado + gráficos: produtos mais vendidos, faturamento por dia, mix de métodos de pagamento.
- Exportação em Excel/CSV e PDF.
- Auditoria: bater números do relatório contra os lançamentos brutos.

### Fase 6 — Recibo
- Recibo imprimível (formato bobina 80mm + A4), com logo, itens, total, pagamento e mensagem personalizada definida no Admin.
- Auditoria final do MVP completo.

## Preparação para multi-tenant (feito desde já, sem custo extra)

Todas as tabelas nascem com `tenant_id` e políticas de acesso por empresa. Login com contas separadas por loja. Isso significa que virar multi-tenant depois é ligar uma chave, não reescrever o sistema.

## Detalhes técnicos

- Banco Supabase já conectado; RLS em todas as tabelas desde a Fase 2.
- Autenticação e-mail/senha na Fase 2, com papéis (dono / operador) em tabela separada de papéis.
- Lógica de servidor via server functions do TanStack Start.
- Exportações: geração no cliente (XLSX/CSV) e PDF via impressão estilizada.
- Logo da cliente entra como asset do projeto.

## Confirmação

Ao terminar cada fase eu rodo a auditoria, corrijo o que aparecer, re-audito e só então peço sua confirmação para seguir.
