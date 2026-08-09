import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Imagens da loja (logo e fotos de produto). Dois formatos convivem:
 * - `storage:<caminho>` → arquivo enviado pela dona, no balde privado da loja;
 * - `https://…`         → link externo colado à mão.
 * A tela não precisa saber a diferença: `useImagem` devolve uma URL exibível.
 */
export const BUCKET = "loja";
const PREFIXO = "storage:";
const VALIDADE = 60 * 60; // 1h de assinatura: sobra para um turno de atendimento

export const ehStorage = (v?: string | null): v is string => !!v && v.startsWith(PREFIXO);
export const caminhoStorage = (v: string) => v.slice(PREFIXO.length);
export const refStorage = (caminho: string) => `${PREFIXO}${caminho}`;

/** Envia o arquivo para `<tenant>/<pasta>` e devolve a referência a guardar no banco. */
export async function enviarImagem(arquivo: File, pasta: string) {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (arquivo.size > 5 * 1024 * 1024) throw new Error("Imagem muito grande — máximo 5 MB.");
  const ext = (arquivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const nome = `${pasta}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nome, arquivo, { contentType: arquivo.type, upsert: false });
  if (error) throw new Error(error.message);
  return refStorage(nome);
}

/** URL exibível de uma imagem só. */
export function useImagem(valor?: string | null) {
  const alvo = ehStorage(valor) ? valor : null;
  const { data } = useQuery({
    queryKey: ["imagem", alvo],
    enabled: !!alvo,
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(caminhoStorage(alvo!), VALIDADE);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });
  if (!valor) return undefined;
  return alvo ? data : valor;
}

/** URLs de uma lista (grade de produtos): uma assinatura para todos de uma vez. */
export function useImagens(valores: (string | null | undefined)[]) {
  const caminhos = [...new Set(valores.filter(ehStorage).map(caminhoStorage))].sort();
  const { data } = useQuery({
    queryKey: ["imagens", caminhos],
    enabled: caminhos.length > 0,
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(caminhos, VALIDADE);
      if (error) throw new Error(error.message);
      const mapa: Record<string, string> = {};
      (data ?? []).forEach((d) => {
        if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
      });
      return mapa;
    },
  });
  return (valor?: string | null) => {
    if (!valor) return undefined;
    return ehStorage(valor) ? data?.[caminhoStorage(valor)] : valor;
  };
}
