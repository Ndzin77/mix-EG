import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { routeTree } from "./routeTree.gen";

/** Chaves que precisam abrir sem internet: catálogo, comandas e preferências. */
const GUARDAR = new Set(["produtos", "comandas", "assinatura", "caixa"]);

export const getRouter = () => {
  /* Tela abre com o que já está em memória e revalida ao fundo: trocar de aba
     ou de período deixa de piscar "carregando" a cada clique. */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 1000 * 60 * 60 * 24 * 7,
        refetchOnWindowFocus: false,
        /* Sem sinal não adianta insistir: usa o que está guardado e segue. */
        retry: () => (typeof navigator !== "undefined" && !navigator.onLine ? false : true),
        networkMode: "offlineFirst",
        placeholderData: <T,>(anterior: T) => anterior,
      },
      mutations: { networkMode: "offlineFirst" },
    },
  });

  /* Guarda o catálogo e as comandas no aparelho: abrir o app sem internet
     mostra a loja do jeito que estava, em vez de tela vazia. */
  if (typeof window !== "undefined") {
    void persistQueryClient({
      queryClient,
      persister: createAsyncStoragePersister({
        storage: {
          getItem: (k) => get<string>(k).then((v) => v ?? null),
          setItem: (k, v) => set(k, v),
          removeItem: (k) => del(k),
        },
        key: "egmix.cache.v1",
        throttleTime: 1000,
      }),
      maxAge: 1000 * 60 * 60 * 24 * 7,
      dehydrateOptions: {
        shouldDehydrateQuery: (q) =>
          q.state.status === "success" && GUARDAR.has(String(q.queryKey[0])),
      },
    });
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
