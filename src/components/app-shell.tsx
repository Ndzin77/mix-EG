import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BarChart3, LogOut, ReceiptText, Settings, ShoppingCart, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/eg-mix-logo.png.asset.json";
import { useSincronizarOffline } from "@/lib/offline";
import { cn } from "@/lib/utils";


const nav = [
  { to: "/", label: "Vendas", icon: ShoppingCart },
  { to: "/saidas", label: "Saídas", icon: ReceiptText },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin", label: "Admin", icon: Settings },
] as const;


/**
 * Command center: rail de navegação fixo à esquerda, área de trabalho densa no
 * centro e coluna opcional à direita (comandas). Nada de espaço morto.
 */
export function AppShell({
  aside,
  children,
}: {
  aside?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  /* Fila offline ligada em toda tela logada: sobe o que ficou esperando. */
  useSincronizarOffline();


  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <nav className="hidden w-20 shrink-0 flex-col items-center gap-6 bg-sidebar py-5 md:flex">
        <img
          src={logoAsset.url}
          alt="Logo EG Mix Sorveteria e Confeitaria"
          className="size-12 shrink-0 rounded-full ring-2 ring-primary shadow-lg"
        />

        <div className="flex flex-col gap-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className={cn(
                "flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl",
                "bg-sidebar-accent/40 text-sidebar-foreground/60 transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
              activeProps={{
                className:
                  "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground shadow-lg",
              }}
            >
              <item.icon className="size-6 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={sair}
          aria-label="Sair da conta"
          className="mt-auto flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl bg-sidebar-accent/40 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="size-6 shrink-0" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Sair</span>
        </button>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>

      {aside ? (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-secondary/40 lg:flex">
          {aside}
        </aside>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-sidebar md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="flex touch-target flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60"
            activeProps={{ className: "text-sidebar-primary" }}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Cabeçalho padrão das telas que não são o PDV. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-card px-6 py-4">
      <div className="min-w-0">
        <h1 className="truncate font-display text-3xl leading-none tracking-wide">{title}</h1>
        {subtitle ? (
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}
