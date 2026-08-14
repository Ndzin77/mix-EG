# Detalhes da conta aberta: virar lista de verdade

O modal de uma conta aberta hoje é um empilhado de cartões grandes, e o mais grave: os botões − / + gravam a alteração no banco no toque, sem confirmação. Vamos torná-lo uma lista densa, previsível e com um histórico que realmente informa — sem poluir.

## 1. Nada muda sem confirmar

- Somem os − / + que salvam direto. A quantidade só muda dentro do modo de edição da linha.
- Tocar em qualquer lugar da linha (ou no lápis) abre a edição inline daquela linha: quantidade e preço unitário, com − / + mexendo apenas no rascunho.
- Enquanto a linha está em edição, aparece o novo subtotal e a diferença ("+R$ 6,00") antes de salvar. Confirmar com o botão verde ou Enter; cancelar com Esc.
- Excluir continua pedindo confirmação, como já pede.

## 2. Lista, não cartões

- Uma linha por item, altura fixa e confortável para o dedo: miniatura pequena · nome · `2× R$ 4,50` · subtotal alinhado à direita.
- Divisores finos no lugar de bordas/sombras por item — o olho percorre a coluna de valores em linha reta (alinhamento à direita, números tabulares).
- Ações (lápis / lixeira) discretas na borda direita, sempre no mesmo lugar; só a linha em foco ganha destaque.
- Cabeçalho fixo da lista com "Item / Qtd / Valor" e rodapé fixo com o total — a lista rola no meio, o total nunca sai da vista.
- Itens ainda não sincronizados ficam com um marcador sutil "aguardando internet" em vez de texto solto.

## 3. Histórico que informa

O bloco vira uma linha do tempo recolhível (fechada por padrão, com "N eventos" no rótulo), agrupada por horário:

- Conta aberta (hora)
- Cada lançamento: hora · `2× Açaí 500ml` · valor da linha
- Cada alteração feita na sessão: hora · o que mudou · o efeito em dinheiro (`+R$ 4,50`)
- Rodapé do histórico: aberta há X min · N itens · ticket médio por item

Assim o resumo ao fechar (que já existe) e o histórico contam a mesma história.

## 4. Hierarquia visual

Três níveis apenas, para reduzir carga cognitiva:
1. Total da conta e botão Receber — maior peso, cor primária/sucesso.
2. Linhas de item — peso normal, contraste médio.
3. Metadados (horas, histórico, avisos) — pequeno e em `muted-foreground`.

Sem cor nova: tudo com os tokens já existentes. Espaçamento em escala 4/8/12 e uma única sombra no contêiner do modal.

## Detalhes técnicos

- Arquivo principal: `src/components/pdv/modal-conta.tsx`. A lista de itens sai para um subcomponente `LinhaItem` no mesmo arquivo (ou `src/components/pdv/linha-conta.tsx` se passar de ~120 linhas) para manter o arquivo legível.
- Estado: mantém `editando` + `rascunho`; os handlers `mudarQtd`/`salvar` passam a operar sobre o rascunho e só chamam `atualizarItemComanda` no confirmar.
- `registrar()` ganha o delta em reais junto do texto, alimentando histórico e resumo de fechamento.
- Sem mudança de banco, de server functions ou do fluxo de cobrança.
