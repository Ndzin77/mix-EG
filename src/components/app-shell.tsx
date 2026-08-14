import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BarChart3,
  ChefHat,
  ChevronLeft,
  ChevronRight,
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
import { LogoMarca } from "@/components/marca-loja";
import { useSincronizarOffline } from "@/lib/offline";
import { useImagem } from "@/lib/imagens";
import { useCorDaLogo } from "@/lib/cor-da-logo";

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
export function AppShell({
  aside,
  marca,
  children,
}: {
  aside?: ReactNode;
  marca?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [config] = useConfig();
  /* A gaveta de contas: cada caixa trabalha do seu jeito e o app lembra. */
  const [recolhido, setRecolhido] = useState(false);
  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem("egmix.aside") === "1");
    } catch {
      /* modo privado: segue aberto */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("egmix.aside", recolhido ? "1" : "0");
    } catch {
      /* sem problema: só não lembra */
    }
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setRecolhido((v) => !v);
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, [recolhido]);

  /* A fila de preparo é opcional: só aparece no menu quando a loja liga. */
  const itens = nav.filter((i) => !("experimental" in i && i.experimental) || config.preparoAtivo);
  const trancada = (secao: Secao | null) => Boolean(secao && config.bloqueios?.[secao]);
  /* A logo cadastrada no Admin manda; a marca de fábrica é só reserva. */
  const logo = useImagem(config.logoUrl);
  /* A cor que manda na logo costura totem e gaveta numa superfície só. */
  const corMarca = useCorDaLogo(config.marca.combinar ? logo : null);
  /* Totem desligado no Admin = coluna não existe. Sem buraco reservado. */
  const totemLigado = Boolean(marca) && config.marca.totem;
  /* Gaveta por cima: camada temporária, o balcão não muda de tamanho. */
  const gavetaCobre = config.marca.gavetaCobre;
  const gavetaAberta = !recolhido;

  useEffect(() => {
    if (!gavetaCobre || !gavetaAberta) return;
    const fechar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRecolhido(true);
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [gavetaCobre, gavetaAberta]);


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
        <LogoMarca
          src={logo}
          nome={config.nomeLoja}
          className="fade-in size-12 shrink-0 rounded-full object-cover text-2xl shadow-lg ring-2 ring-primary"
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
                  <span className="absolute -right-2.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-black leading-4 text-primary-foreground ring-2 ring-sidebar">
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

        <div
          className={cn(
            "flex shrink-0 items-center gap-3 bg-sidebar px-3 transition-all duration-300 ease-out md:hidden",
            totemLigado ? "h-20" : "h-12",
          )}
        >
          <LogoMarca
            src={logo}
            nome={config.nomeLoja}
            className={cn(
              "shrink-0 rounded-full object-cover ring-2 ring-primary transition-all duration-300 ease-out",
              totemLigado ? "size-16 text-3xl" : "size-8 text-lg",
            )}
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-display leading-none tracking-wide text-sidebar-foreground",
              totemLigado ? "text-2xl" : "text-lg",
            )}
          >
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

      {totemLigado ? (
        <div
          className={cn(
            "hidden shrink-0 transition-all duration-300 ease-out",
            gavetaCobre
              ? "lg:flex lg:w-80 xl:w-96"
              : recolhido
                ? "lg:flex lg:w-80 xl:w-96"
                : "xl:flex xl:w-72",
          )}
        >
          {marca}
        </div>
      ) : null}


      {aside ? (
        <>
          <aside
            style={(gavetaCobre || recolhido) && corMarca ? { background: corMarca.suave } : undefined}
            className={cn(
              "hidden shrink-0 flex-col transition-all duration-300 ease-out lg:flex",
              gavetaCobre || recolhido
                ? cn("w-12", gavetaCobre && !corMarca && "bg-secondary")
                : "w-80 border-l border-border bg-secondary/40",
            )}
          >
            {/* Marca nunca some: com a gaveta aberta ela vem para o topo do painel. */}
            {totemLigado && !recolhido && !gavetaCobre ? (
              <div
                style={corMarca ? { background: corMarca.suave } : undefined}
                className="flex shrink-0 items-center gap-3 border-b border-border bg-gradient-to-r from-primary-soft to-card px-3 py-3 xl:hidden"
              >
                <LogoMarca
                  src={logo}
                  nome={config.nomeLoja}
                  className="size-16 shrink-0 rounded-2xl object-contain text-3xl drop-shadow-md"
                />
                <span className="min-w-0 flex-1 truncate font-display text-xl tracking-wide">
                  {config.nomeLoja}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setRecolhido((v) => !v)}
              title={recolhido ? "Abrir contas (Ctrl+B)" : "Recolher contas (Ctrl+B)"}
              aria-label={recolhido ? "Abrir painel de contas" : "Recolher painel de contas"}
              className={cn(
                "press flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-bold transition-colors",
                gavetaCobre || recolhido
                  ? "h-full flex-col justify-start text-foreground/60 hover:text-foreground"
                  : "justify-between border-b border-border bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {gavetaCobre || recolhido ? (
                <>
                  <ChevronLeft className="size-5" />
                  <span className="mt-2 uppercase tracking-widest [writing-mode:vertical-rl]">
                    Contas
                  </span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-widest">Contas</span>
                  <ChevronRight className="size-5" />
                </>
              )}
            </button>
            {gavetaCobre || recolhido ? null : (
              <div className="flex min-h-0 flex-1 flex-col">{aside}</div>
            )}
          </aside>

          {/* Modo "cobrir": camada temporária por cima do balcão, que não encolhe. */}
          {gavetaCobre && !recolhido ? (
            <>
              {/* Clique fora fecha — mas sem escurecer nem embaçar a venda:
                  quem está no balcão continua lendo produtos e preços. */}
              <button
                type="button"
                aria-label="Fechar painel de contas"
                onClick={() => setRecolhido(true)}
                className="fixed inset-0 z-30 hidden cursor-default bg-transparent lg:block"
              />
              <aside
                className="gaveta-cobre fixed inset-y-0 right-12 z-40 hidden w-80 flex-col border-l border-border bg-card shadow-2xl lg:flex xl:w-96"
                aria-label="Contas em aberto"
              >

                <button
                  type="button"
                  onClick={() => setRecolhido(true)}
                  title="Recolher contas (Ctrl+B ou Esc)"
                  className="press flex shrink-0 items-center justify-between border-b border-border bg-secondary px-3 py-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="uppercase tracking-widest">Contas</span>
                  <span className="flex items-center gap-2">
                    <span className="kbd">Esc</span>
                    <ChevronRight className="size-5" />
                  </span>
                </button>
                <div className="flex min-h-0 flex-1 flex-col">{aside}</div>
              </aside>
            </>
          ) : null}
        </>
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
                <span className="absolute -right-2.5 -top-1.5 grid min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-black leading-4 text-primary-foreground ring-2 ring-sidebar">
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
