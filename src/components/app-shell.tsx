import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  BarChart3,
  ChefHat,
  Lock,
  LogOut,
  ReceiptText,
  Settings,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/eg-mix-logo.png.asset.json";
import { useSincronizarOffline } from "@/lib/offline";
import { useImagem } from "@/lib/imagens";
import { cn } from "@/lib/utils";
import { useConfig } from "@/lib/config";
import { minhaAssinatura } from "@/lib/assinatura.functions";
import { FaixaAssinatura } from "@/components/faixa-assinatura";

import type { Secao } from "@/lib/travas";

const nav = [
  { to: "/vendas", label: "Vendas", icon: ShoppingCart, secao: null },
  { to: "/preparo", label: "Preparo", icon: ChefHat, secao: null, experimental: true },
  { to: "/saidas", label: "Saídas", icon: ReceiptText, secao: "saidas" },
  { to: "/caixa", label: "Caixa", icon: Wallet, secao: "caixa" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, secao: "relatorios" },
  { to: "/admin", label: "Admin", icon: Settings, secao: "admin" },
  { to: "/assinatura", label: "Assinatura", icon: BadgeCheck, secao: "assinatura" },
] as const satisfies readonly {
  to: string;
  label: string;
  icon: typeof ShoppingCart;
  secao: Secao | null;
  experimental?: boolean;
}[];

/**
 * Command center: rail de navegação fixo à esquerda, área de trabalho densa no
 * centro e coluna opcional à direita (comandas). Nada de espaço morto.
 */
export function AppShell({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [config] = useConfig();
  /* A fila de preparo é opcional: só aparece no menu quando a loja liga. */
  const itens = nav.filter((i) => !("experimental" in i && i.experimental) || config.preparoAtivo);
  const trancada = (secao: Secao | null) => Boolean(secao && config.bloqueios?.[secao]);
  /* A logo cadastrada no Admin manda; a marca de fábrica é só reserva. */
  const logo = useImagem(config.logoUrl) ?? logoAsset.url;
  /* Fila offline ligada em toda tela logada: sobe o que ficou esperando. */
  useSincronizarOffline();
  /* Mesma chave do aviso de assinatura: uma consulta serve as duas coisas. */
  const lerAssinatura = useServerFn(minhaAssinatura);
  const assinatura = useQuery({
    queryKey: ["assinatura"],
    queryFn: () => lerAssinatura(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  /* Ponto vermelho só quando existe algo a resolver — alerta que não mente. */
  const atrasada = Boolean(assinatura.data && !assinatura.data.emDia);
  const alerta = (secao: Secao | null) => secao === "assinatura" && atrasada;
  /* Número no lugar de bolinha: "faltam 4 dias" move mais que um pontinho. */
  const restam = atrasada ? (assinatura.data?.restam ?? 0) : null;


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
          src={logo}
          alt={`Logo ${config.nomeLoja}`}
          className="fade-in size-12 shrink-0 rounded-full object-cover ring-2 ring-primary shadow-lg"
        />

        <div className="flex flex-col gap-3">
          {itens.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
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
              <span className="relative">
                <item.icon className="size-6 shrink-0" />
                {trancada(item.secao) ? (
                  <Lock className="absolute -right-2 -top-1 size-3.5 rounded-full bg-warning p-0.5 text-warning-foreground" />
                ) : null}
                {alerta(item.secao) ? (
                  <span className="absolute -right-2.5 -top-1.5 grid min-w-[18px] animate-pulse place-items-center rounded-full bg-danger px-1 text-[10px] font-black leading-4 text-primary-foreground ring-2 ring-sidebar">
                    {restam}
                  </span>
                ) : null}

              </span>
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

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Cobrança à vista, sem dispensar: quem está atrasado vê em toda tela. */}
        <FaixaAssinatura />
        {/* Celular: a marca da loja fica no mesmo canto do olho, sempre. */}

        <div className="flex h-12 shrink-0 items-center gap-2.5 bg-sidebar px-3 md:hidden">
          <img
            src={logo}
            alt={`Logo ${config.nomeLoja}`}
            className="size-8 shrink-0 rounded-full object-cover ring-2 ring-primary"
          />
          <span className="min-w-0 flex-1 truncate font-display text-lg leading-none tracking-wide text-sidebar-foreground">
            {config.nomeLoja}
          </span>
          <button
            type="button"
            onClick={sair}
            aria-label="Sair da conta"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-accent/40 text-sidebar-foreground/70"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        {children}
      </main>

      {aside ? (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-secondary/40 lg:flex">
          {aside}
        </aside>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-border bg-sidebar md:hidden"
        style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}
      >
        {itens.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: true }}
            className="flex touch-target flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60"
            activeProps={{ className: "text-sidebar-primary" }}
          >
            <span className="relative">
              <item.icon className="size-5" />
              {trancada(item.secao) ? (
                <Lock className="absolute -right-2 -top-1 size-3 rounded-full bg-warning p-0.5 text-warning-foreground" />
              ) : null}
              {alerta(item.secao) ? (
                <span className="absolute -right-2.5 -top-1.5 grid min-w-[16px] animate-pulse place-items-center rounded-full bg-danger px-1 text-[9px] font-black leading-4 text-primary-foreground ring-2 ring-sidebar">
                  {restam}
                </span>
              ) : null}

            </span>
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
