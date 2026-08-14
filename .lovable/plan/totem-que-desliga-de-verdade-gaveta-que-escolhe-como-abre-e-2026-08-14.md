# Totem que desliga de verdade, gaveta que escolhe como abre e opacidade 0–100

Três ajustes no controle da marca, todos com o mesmo princípio: o que o Admin promete é exatamente o que aparece no balcão.

## 1. Desligar o totem desliga mesmo

Hoje, ao desmarcar "Coluna da marca durante a venda", a logo some mas a coluna continua reservada e o cabeçalho do celular segue no tamanho grande — o balcão fica com um buraco.

- Sem totem: a coluna deixa de existir; a grade de produtos e o carrinho ocupam a largura toda, com transição suave (nada "pula").
- Sem totem: o cabeçalho do celular volta à altura compacta e o bloco de logo no topo da gaveta não é mais renderizado.
- A marca não desaparece do sistema: a logo continua na barra lateral de navegação, no recibo e na vitrine (se ligada).

## 2. Como a gaveta de contas abre

Nova escolha no Admin, no bloco Totem/Balcão, com duas opções desenhadas (não texto solto), prévia atualizando na hora:

- **Empurrar** (como está hoje): a gaveta abre ao lado e o balcão encolhe. Bom em tela larga.
- **Cobrir**: a gaveta desliza por cima do balcão, com fundo escurecido e desfoque leve atrás. O balcão não muda de tamanho — nada se recalcula sob o olhar de quem está vendendo, e o cérebro trata a gaveta como camada temporária, não como novo layout.

No modo Cobrir: entra da direita em 220 ms com curva de desaceleração, fecha por Esc, clique fora, Ctrl+B ou botão; foco vai para dentro da gaveta ao abrir e volta ao campo de busca ao fechar. Quem pediu menos movimento recebe só o fade.

## 3. Opacidade de 0 a 100

- A régua da logo do totem passa a ir de **0 a 100** (hoje trava em 40).
- 100 = **sólida** (sem transparência); 0 = invisível.
- Marcas de leitura na régua: `0 invisível · 50 discreta · 100 sólida`, com o número grande sempre à vista.
- O mesmo se aplica à prévia do Admin, que mostra o valor exato aplicado.
- Valores antigos salvos continuam válidos; nada precisa ser reconfigurado.

## Camada de neurociência aplicada

- **Consistência prévia↔realidade**: a miniatura do Admin usa exatamente as mesmas regras de opacidade, largura e modo de gaveta da tela de vendas.
- **Uma decisão por linha**: cada chave carrega título curto e uma frase de consequência ("o balcão encolhe" / "a gaveta passa por cima").
- **Estado nulo honesto**: com o totem desligado, o bloco mostra em uma linha o que a loja perde, sem cartão vazio.
- **Movimento com função**: só transições de largura/entrada, sem nada piscando no canto do olho durante a venda; `prefers-reduced-motion` respeitado.

## Detalhes técnicos

- `src/lib/config.ts`: `opacidadeTotem` passa a ser limitado a 0–100; novo campo `gavetaCobre: boolean` (padrão `false`) em `MarcaConfig`, tratado em `normalizarMarca` para configs antigas.
- `src/components/app-shell.tsx`: não renderiza a coluna da marca nem o cabeçalho grande quando o totem está desligado (checa `config.marca.totem`); implementa o modo sobreposto da gaveta (`fixed` + backdrop + Esc/clique-fora) mantendo o modo atual quando `gavetaCobre` for falso.
- `src/components/admin/cartao-marca.tsx`: régua 0–100 com marcas, seletor de modo da gaveta e prévia refletindo os dois.
- `src/components/pdv/faixa-marca.tsx`: sem mudança de contrato; segue retornando `null` sem totem.
- Sem mudança de banco (o campo novo entra no JSON de configuração já existente) e sem mudança em cobrança ou relatórios.
