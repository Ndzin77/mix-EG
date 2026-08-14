import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { configDaLinha, definirPersistidorConfig, hidratarConfig, linhaDaConfig } from "@/lib/config";
import { obterLoja, salvarLoja } from "@/lib/loja.functions";

/**
 * As preferências da loja moram no banco (store_settings), não no navegador:
 * o caixa da frente e o do fundo veem o mesmo salão, a mesma meta e os mesmos
 * atalhos. O localStorage fica só como cópia para a tela abrir instantânea.
 */
export function useSincronizarConfig() {
  const carregar = useServerFn(obterLoja);
  const gravar = useServerFn(salvarLoja);

  const { data } = useQuery({
    queryKey: ["loja"],
    queryFn: () => carregar(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) hidratarConfig(configDaLinha(data));
  }, [data]);

  useEffect(() => {
    definirPersistidorConfig((patch) => {
      const linha = linhaDaConfig(patch);
      if (!Object.keys(linha).length) return;
      void gravar({ data: linha }).catch(() =>
        toast.error("Preferência salva só neste aparelho — sem conexão com a loja."),
      );
    });
    return () => definirPersistidorConfig(null);
  }, [gravar]);
}
