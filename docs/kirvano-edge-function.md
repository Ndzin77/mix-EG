# Função `kirvano` no Supabase — passo a passo

Endereço final, curto e independente de domínio:

```
https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano
```

## O código NÃO está mais neste arquivo

Ele vive em **`docs/kirvano-edge-function.ts`** — um arquivo TypeScript puro,
sem nenhuma marcação de markdown. É de propósito: as crases (```` ``` ````)
deste tipo de documento eram o que quebrava o deploy com
`Unexpected eof ... ``` `.

## Como publicar (1 minuto)

1. Abra `docs/kirvano-edge-function.ts` no editor do projeto.
2. **Ctrl+A** e **Ctrl+C** (copia o arquivo inteiro, sem sobras).
3. Supabase → **Edge Functions** → `kirvano` → **Edit function**.
4. **Ctrl+A** no editor do Supabase e **Ctrl+V** por cima (substitui tudo).
5. **Deploy function**.
6. Confirme **Settings** → **Verify JWT** **desmarcado**. Sem isso a Kirvano recebe 401.

Na Kirvano nada muda: mesmo endereço, cabeçalho `security-token` = `rv@n0)-!PapK1`.

As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão
nas Edge Functions — não precisa cadastrar nada.

## Conferir depois de publicar

- Abrir o endereço no navegador → `{"ok":true,"porta":"kirvano"}`.
- `POST` sem `security-token` → `401`.
- `POST` com `security-token: rv@n0)-!PapK1` → `200`, e o log da função mostra
  `Confere? true`.

## Configuração versionada no projeto

`supabase/config.toml` já marca a função com:

    [functions.kirvano]
    verify_jwt = false
