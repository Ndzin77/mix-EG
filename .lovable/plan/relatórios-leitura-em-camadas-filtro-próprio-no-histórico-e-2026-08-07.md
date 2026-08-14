# Relatórios: leitura em camadas, filtro próprio no histórico e planilhas limpas

## 1. A tela em ordem de importância

Hoje a tela mostra tudo com o mesmo peso e obriga a rolar muito. A nova ordem segue como o olho lê e como a decisão é tomada:

1. **Faixa fixa no topo** (não some ao rolar): período selecionado + Entradas, Saídas, Resultado. É o que se olha em 2 segundos.
2. **Fechamento por dia** — o miolo do relatório, primeiro bloco da página.
3. **Blocos de apoio recolhidos** (sanfona, fechados por padrão): Entrada × saída, Produtos mais vendidos, Como entrou o dinheiro, Para onde foi o dinheiro. Quem quer detalhe abre; quem quer o número já viu.
4. **Histórico de vendas**, com filtro próprio.

Ajustes de leitura: números monetários alinhados à direita em colunas de mesma largura, dias com listra alternada, dia de hoje destacado, tipografia em duas escalas só (número grande / rótulo pequeno), e menos texto explicativo dentro dos cartões.

## 2. Fechamento por dia + detalhe por produto

- Cada dia vira uma linha clicável que **abre e fecha o detalhe individualmente** (não mais um interruptor global que estoura a página inteira).
- O checkbox "Ver detalhe por produto" continua, mas passa a significar "abrir todos" / "fechar todos".
- Detalhe reorganizado em duas colunas com cabeçalho e alinhamento reais:

```text
04/08/2026        faturou R$ 520,00   saiu R$ 120,00   sobrou R$ 400,00
  FATURAMENTO                          SAÍDAS
  Qtd  Produto            Valor        Categoria   Descrição      Valor
   8×  Açaí 500ml     R$ 200,00        Insumos     Polpa açaí   R$ 90,00
   6×  Bolo fatia     R$ 120,00        Embalagem   Copos        R$ 30,00
  ---------------------------------    ---------------------------------
  Total              R$ 520,00         Total                   R$ 120,00
```

- Listas longas de um dia ganham rolagem própria, para o dia seguinte não ser empurrado para fora da tela.
- Rodapé fixo do bloco com o TOTAL do período, sempre visível.

## 3. Histórico de vendas com filtro próprio

O histórico deixa de depender do período do topo:

- Filtro próprio de datas (mesmo seletor de período usado no topo), começando igual ao período principal mas ajustável sozinho.
- Busca por nome da conta/cliente.
- Filtro por forma de pagamento (dinheiro, PIX, débito, crédito).
- Ordenar por mais recente / maior valor.
- Lista com rolagem própria e contador "X vendas · R$ Y" refletindo o filtro.
- Clicar na linha abre um **modal da venda** com itens, desconto, formas de pagamento e botão de recibo — hoje só existe o botão de recibo.

## 4. Planilhas refeitas

O CSV atual mistura tudo numa tabela só: título decorativo, linhas em branco, e no modo detalhado o valor do produto cai na coluna "Sobrou". Vira lixo no Excel. Novo formato:

**Planilha resumida** — só isto, sem título nem linha em branco:

```text
Dia;Vendas;Faturou;Saiu;Sobrou
01/08/2026;12;420,00;80,00;340,00
02/08/2026;9;310,00;0,00;310,00
TOTAL;21;730,00;80,00;650,00
```

**Planilha detalhada** — uma linha por item, colunas fixas, dá para filtrar e somar no Excel:

```text
Dia;Tipo;Categoria;Descrição;Qtd;Valor
01/08/2026;Venda;;Açaí 500ml;8;200,00
01/08/2026;Saída;Insumos;Polpa açaí;;90,00
```

- Botão "Planilha" abre um mini-menu com as duas opções (resumida / detalhada), em vez de depender do checkbox da tela.
- Números saem como número (vírgula decimal, sem "R$"), datas como texto dd/mm/aaaa — o Excel soma sozinho.
- Nome do arquivo: `relatorio-resumo-01-08-2026-a-06-08-2026.csv`.

## 5. Impressão

Folha de impressão limpa: cabeçalho com nome da loja e período, tabela do fechamento por dia (com ou sem detalhe conforme o que está aberto na tela) e o total. Some tudo que é botão, filtro e sanfona.

## Detalhes técnicos

- `src/routes/_authenticated/relatorios.tsx` é quebrado em componentes: `ResumoTopo`, `FechamentoDias`, `BlocosAnalise`, `HistoricoVendas`, `ModalVenda` (em `src/components/relatorios/`), para o arquivo parar de ter 600 linhas.
- Faixa fixa via `sticky top-0 z-10` dentro do container rolável; sanfonas com estado local e `aria-expanded`.
- Histórico: `useQuery` com chave própria `["historico", filtro]`, reaproveitando `SeletorPeriodo`; busca/forma/ordem aplicadas no cliente sobre as até 200 linhas já carregadas.
- Modal da venda reaproveita `reciboDaVenda` (já existente) e o `Modal` da casa.
- Exportação: `src/lib/exportar.ts` ganha `linhasResumo()` e `linhasDetalhe()` puras a partir de `fechamentoDiario`; `baixarCsv` passa a aceitar números crus sem forçar 2 casas em campos de texto.
- Sem mudança de schema nem de funções de servidor.
