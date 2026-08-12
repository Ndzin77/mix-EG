# Ajustes gerais: login, confirmações, admin enxuto e relatórios organizados

## 1. Login que não entra (causa confirmada)

Testei a senha direto no servidor de autenticação: `eg@gmail.com` / `admin1234` está **correta** (resposta 200, usuário confirmado). Reproduzi a falha no navegador: quando o formulário é enviado **antes de a página terminar de carregar**, o navegador faz o envio nativo do formulário, a página recarrega em `/auth?`, os campos ficam vazios e nada acontece — exatamente o "não consigo logar". Depois que a página carrega por completo, o login entra normalmente.

Correção:

- A tela de login passa a ser somente-cliente (sem renderização prévia no servidor), eliminando a janela em que o formulário existe mas ainda não está "vivo".
- Botão "Entrar" desabilitado até a tela estar pronta, com texto "Carregando...".
- Mensagem de erro clara quando a senha ou e-mail estiverem errados (hoje algumas falhas passam em silêncio).

## 2. Confirmação em tudo que exclui

Um único diálogo de confirmação reaproveitado (título, aviso do que será perdido, "Cancelar" / "Excluir"), aplicado em:

- Admin: excluir produto, remover categoria de saída, remover foto/logo.
- Saídas: excluir lançamento.
- Vendas: cancelar/excluir comanda, remover item do carrinho e da conta aberta.
- Salão: remover mesa/destino.

## 3. Admin mais enxuto

- Remover o campo "Meta do dia".
- Remover o bloco inteiro "Privacidade do caixa" (o caixa passa a aparecer sempre normal em Vendas).
- Campo "Código" do produto aceita **apenas números** (teclado numérico no celular, letras bloqueadas).
- O código nunca vira aba/categoria em Vendas: as abas usam só a categoria cadastrada; produtos sem categoria ficam na aba "Todos", sem criar aba fantasma.

## 4. Relatórios reorganizados  
isso de acordo com o filtro de dias selecionados

A tela mantém os números do período, mas o miolo vira uma lista por dia, limpa:

```text
Período 01/08/2026 – 06/08/2026
01/08/2026   faturou R$ 420,00   saiu R$ 80,00   sobrou R$ 340,00
02/08/2026   faturou R$ 310,00   saiu R$ 0,00    sobrou R$ 310,00
...
TOTAL        faturou R$ ...      saiu R$ ...     sobrou R$ ...
```

Um botão alterna para o modo **detalhado**, que abre cada dia:

```text
03/08/2026   faturou R$ 520,00   saiu R$ 120,00   sobrou R$ 400,00
   Faturamento                     Saídas
   Açaí 500ml      8un  R$ 200,00  Insumos   R$ 90,00
   Bolo fatia      6un  R$ 120,00  Embalagem R$ 30,00
   ...                             ...
```

- Exportação em planilha segue os dois mesmos formatos (resumido ou detalhado, conforme o modo na tela).
- Sai da tela o que é ruído: variações percentuais redundantes e blocos duplicados; ficam entrada, saída, resultado e o ranking de produtos.

## 5. Limpeza visual

Passada de layout nas telas de Vendas, Saídas, Caixa e Admin: espaçamento e tamanhos de fonte uniformes, títulos e cartões no mesmo padrão, menos texto explicativo dentro das telas.

## Detalhes técnicos

- Login: `ssr: false` na rota `/auth` + estado `pronto` controlando o botão; erro do Supabase exibido via toast.
- Confirmação: componente `ConfirmarExclusao` sobre o `Modal` existente, com hook `useConfirmar()` para chamada imperativa.
- Admin: remover `metaDiaria` e `caixaPrivado` da UI (campos permanecem no banco, sem uso); `inputMode="numeric"` e filtro `replace(/\D/g, "")` no código do produto.
- Relatórios: nova função de servidor que agrega por dia (entrada, saída, resultado) e, no modo detalhado, itens vendidos e saídas por dia; CSV gerado a partir da mesma estrutura.