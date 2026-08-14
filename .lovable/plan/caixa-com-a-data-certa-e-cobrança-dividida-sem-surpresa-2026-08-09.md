# Caixa com a data certa e cobrança dividida sem surpresa

## 1. Caixa: venda feita à noite não aparecia

Confirmei olhando o banco e o código: a última venda (R$ 47, débito) foi fechada às 22:02 daqui — que no relógio do servidor já é dia seguinte (01:02). A tela de Caixa monta o intervalo do dia usando o relógio do servidor, não o da loja, então tudo que é vendido depois das 21h cai no dia seguinte e o "Hoje" não aumenta. Relatórios já faz certo (manda o fuso do navegador junto), Caixa e Saídas não.

O que muda: Caixa e Saídas passam a receber o fuso da loja, igual Relatórios. Resultado: o dia do caixa passa a ser o dia da loja (00:00 às 23:59 daqui), entradas, saídas, sobrou e gaveta batem com a realidade — inclusive vendas da noite.

Também nesse pacote: "Entrou" continua sendo a soma das vendas, mas as caixinhas por forma de pagamento (dinheiro / PIX / débito / crédito) passam a somar exatamente o mesmo total — hoje elas usam duas fontes diferentes e podem divergir quando a venda foi dividida.

## 2. Conta dividida: o botão verde diz o que falta

Hoje, conta de R$ 47 com R$ 40 encaixados no débito: o botão verde mostra "Confirmar R$ 47,00" e, se apertar, ele joga sozinho os R$ 7 restantes na forma que estiver selecionada — sem avisar.

Como fica:

- Enquanto falta dinheiro, o botão verde **não fecha a venda**. Ele mostra `Falta R$ 7,00` e leva o foco para o campo do valor, com o valor que falta já preenchido — um toque em "Encaixar" fecha a parte.
- O botão só vira verde de "Confirmar R$ 47,00" quando a soma das partes cobre a conta.
- Acima do botão, uma linha fixa e curta: `Produtos R$ 47,00 · Encaixado R$ 40,00 · Falta R$ 7,00` (ou "Sobra", em verde, quando as partes passam do total).
- Se a pessoa realmente quiser fechar deixando a diferença, o caminho fica explícito: um botão discreto "Encaixar o que falta em débito" ao lado do campo. Nada mais entra automaticamente.
- Sobra continua valendo como acréscimo e falta como desconto — como já é hoje — mas só depois de encaixado à mão.

## 3. Desconto vira pop-up dentro do modal

O bloco de desconto sai do corpo do modal. Fica só um botão-resumo na linha das chaves: "Desconto" ou "Desconto − R$ 4,50". Tocando nele abre uma janelinha pequena por cima do modal com o que já existe (R$ / %, campo, atalhos 5/10/15% e o equivalente), com "Aplicar" e "Remover desconto". Fechada, o modal fica com valor, formas de pagamento, valor recebido e confirmar — sem rolagem no caso comum.

## Detalhes técnicos

- `src/lib/vendas.functions.ts` (`resumoCaixa`) e `src/lib/saidas.functions.ts` (`listarSaidas`, `resumoSaidas`): aceitar `offsetMin` no validador e montar o intervalo com `instante()` de `src/lib/relatorios.ts` em vez de `new Date("...T00:00:00")` + `setHours`, que no worker resolve em UTC.
- `src/routes/_authenticated/caixa.tsx` e `saidas.tsx`: enviar `offsetMin: new Date().getTimezoneOffset()` e incluí-lo na `queryKey`.
- `resumoCaixa`: derivar `entradas` da mesma base de `somarFormas` para os cartões fecharem com o total.
- `src/lib/cobranca.ts` (`resumoCobranca`): no modo `dividir`, parar de anexar a parte fantasma do `falta`; expor `podeFechar` (falta < 0,005) e manter `cobrado = soma das partes`.
- `src/components/pdv/modal-cobranca.tsx`: botão principal com dois estados (falta → foca/preenche o campo; quitado → confirma); faixa de resumo acima do rodapé; desconto extraído para um sub-modal local (`descontoAberto`), reaproveitando `aplicarDesconto`.
- Sem mudança de banco; nada nos dados já gravados.
