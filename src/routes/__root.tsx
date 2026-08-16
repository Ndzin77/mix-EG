import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { ProvedorConfirmacao } from "@/components/confirmar";
import { FaixaOffline } from "@/components/faixa-offline";
import { registrarApp } from "@/lib/pwa";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const rota = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  const detalhe = [
    `Rota: ${rota}`,
    `Quando: ${new Date().toLocaleString("pt-BR")}`,
    `Erro: ${error?.name ?? "Error"}: ${error?.message ?? "sem mensagem"}`,
    error?.stack ? `\n${error.stack}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  console.error("[EG Mix] tela de erro", detalhe, error);

  /* Sessão vencida no meio do expediente vira login, não tela de erro. */
  const semSessao = /unauthorized|401|jwt|not authenticated/i.test(
    `${error?.message ?? ""} ${(error as { status?: number } | undefined)?.status ?? ""}`,
  );
  useEffect(() => {
    if (semSessao && typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
      window.location.replace("/auth");
      return;
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component", rota });
  }, [error, rota, semSessao]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="font-display text-3xl tracking-wide text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Deu um problema aqui do nosso lado. Tente novamente ou volte para o início — nada do que
          já foi lançado se perde.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/vendas"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para vendas
          </a>
        </div>
        <details className="mt-6 rounded-lg border border-border bg-card p-3 text-left">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Detalhes para o suporte
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[0.7rem] leading-snug text-muted-foreground">
            {detalhe}
          </pre>
          <button
            onClick={() => void navigator.clipboard?.writeText(detalhe)}
            className="mt-2 rounded-md border border-input px-3 py-1.5 text-xs font-bold"
          >
            Copiar detalhes
          </button>
        </details>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EG Mix — Sorveteria e Confeitaria" },
      { name: "description", content: "Sistema de vendas, caixa e relatórios da EG Mix." },
      { name: "author", content: "EG Mix" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#e8437f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "EG Mix" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Bebas+Neue&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icon-512.png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  /* App instalável: o registro só acontece no app publicado (ver src/lib/pwa.ts). */
  useEffect(() => {
    registrarApp();
    /* Leituras guardadas no aparelho: sem sinal, produtos, contas abertas e
       configuração da loja continuam na tela em vez de dar erro. */
    try {
      const [restaurar] = persistQueryClient({
        queryClient,
        persister: createSyncStoragePersister({ storage: window.localStorage, key: "egmix.cache.v1" }),
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      void restaurar;
    } catch {
      /* modo privado do navegador: segue só em memória */
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <FaixaOffline />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <ProvedorConfirmacao>
        <Outlet />
      </ProvedorConfirmacao>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>

  );

}
