# Corrigir o build do recibo (logo) + expor dados da loja no Admin

## O erro

O build quebra em `src/components/recibo/recibo.tsx`, que importa o arquivo de imagem
`@/assets/eg-mix-logo.png`. Esse arquivo binário não existe mais no projeto: a logo foi
migrada para o CDN e no lugar dela ficou só o ponteiro `eg-mix-logo.png.asset.json`.
O `app-shell.tsx` já usa a forma nova; o recibo ficou na forma antiga.

## Correção

- Em `src/components/recibo/recibo.tsx`: trocar o import da imagem pelo ponteiro
`@/assets/eg-mix-logo.png.asset.json` e usar `logoAsset.url` no `<img src>`,
igual ao que o `app-shell.tsx` já faz.
- Rodar o build para confirmar que passa.

Nada mais muda no recibo: layout, bobina 80mm, A4 e impressão continuam iguais.

## Pendência que ficou da Fase 6

Expor no Admin os campos **nome da loja, telefone, endereço e mensagem do recibo**
(já existem em `Config` e em `store_settings`, e já alimentam o cabeçalho/rodapé do
recibo — falta só a tela para editar). Inclui isso na mesma leva, com salvamento
via as funções de loja existentes.

## Depois

Com o build verde, faço a auditoria final do MVP (Fases 1–6) e listo o que ficou
pendente antes de fechar.  
alem disso melhore no relatorio/saída ou qualquer outra seção que tiver filtro por datas, coloque o filtro tipo auqele da utmify/ gerenciador de anucnio selecionando o periodo tbm.  
alem disso a exportação de o que vendeu no dia e planilha, é somente isso, e vc ta colocando coisas denecessarias, aquilo é pra mandar apenas o necessario para o contador e de forma mais organizada