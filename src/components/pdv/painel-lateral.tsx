import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  Search,
  Settings2,
  Trash2,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmar } from "@/components/confirmar";
import { supabase } from "@/integrations/supabase/client";
import { brl, ehMesa, rotulosMesa, urgencia, useConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { cancelarComanda, listarComandas } from "@/lib/vendas.functions";

import { norm, type ComandaCard } from "./comum";
import { EditorSalao } from "./editor-salao";
import { ModalConta } from "./modal-conta";


/**
 * Painel lateral — caixa do dia, salão (se a loja quiser) e contas abertas.
 * Tudo o que aparece aqui é sincronizado ao vivo entre os caixas da loja.
 */
export function PainelLateral({
  onAbrir,
  onNovoDestino,
  ativa,
  destino,
}: {
  onAbrir: (c: ComandaCard, receber: boolean) => void;
  onNovoDestino: (label: string) => void;
  ativa: string | null;
  destino: string | null;
}) {
  const [config] = useConfig();
  const [editando, setEditando] = useState(false);
  const [aoVivo, setAoVivo] = useState(false);
  /** valor em aberto escondido: o cliente do outro lado do balcão não lê.
   *  Cada conta tem seu próprio olho; o do topo abre/esconde todos. */
  const [visiveis, setVisiveis] = useState<Set<string>>(() => new Set());
  const [dicaSalao, setDicaSalao] = useState(false);
  /** conta com os itens abertos na lista — dá para ver o que a pessoa pediu */
  const [expandida, setExpandida] = useState<string | null>(null);
  /** conta aberta no modal de detalhes, para editar item por item */
  const [detalhe, setDetalhe] = useState<string | null>(null);


  const [filtro, setFiltro] = useState("");
  const queryClient = useQueryClient();
  const confirmar = useConfirmar();

  const buscarComandas = useServerFn(listarComandas);
  const descartar = useServerFn(cancelarComanda);

  const comandasQuery = useQuery({ queryKey: ["comandas"], queryFn: () => buscarComandas() });

  const cancelar = useMutation({
    mutationFn: (id: string) => descartar({ data: { id } }),
    onSuccess: () => {
      toast.success("Comanda cancelada");
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* Dois caixas, uma verdade: o que um lança aparece no outro na hora. */
  useEffect(() => {
    const canal = supabase
      .channel("pdv-comandas")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["comandas"] });
        queryClient.invalidateQueries({ queryKey: ["caixa"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["comandas"] });
      })
      .subscribe((status) => setAoVivo(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [queryClient]);

  /* Relógio próprio: o minuto na tela precisa envelhecer sozinho. */
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const contas = useMemo(
    () =>
      (comandasQuery.data ?? []).map((c) => ({
        id: c.id,
        label: c.label,
        valor: Number(c.total ?? 0),
        min: Math.max(0, Math.round((agora - new Date(c.opened_at).getTime()) / 60000)),
        opened_at: c.opened_at,
        itens: (c.order_items ?? []).map((i) => ({
          id: i.id,
          product_id: i.product_id,
          product_name: i.product_name,
          unit_price: Number(i.unit_price),
          quantity: Number(i.quantity),
          created_at: i.created_at,
          updated_at: i.updated_at,
        })),


      })),
    [agora, comandasQuery.data],
  );

  /* Mapa do salão: existe só se a loja disse que tem salão. */
  const mesas = useMemo(
    () =>
      rotulosMesa(config).map((label, i) => ({
        numero: i + 1,
        label,
        conta: contas.find((c) => norm(c.label) === norm(label)),
      })),
    [config, contas],
  );

  const avulsas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return contas
      .filter((c) => !(config.salaoAtivo && ehMesa(c.label, config)))
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .sort((a, b) => b.min - a.min);
  }, [config, contas, filtro]);

  const pendente = contas.reduce((s, c) => s + c.valor, 0);
  const ocupadas = mesas.filter((m) => m.conta).length;

  /* Olho por conta: o valor de uma some sem esconder o resto. */
  const visivel = (id: string) => visiveis.has(id);
  const alternar = (id: string) =>
    setVisiveis((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  const todosVisiveis = contas.length > 0 && contas.every((c) => visiveis.has(c.id));
  const alternarTodos = () =>
    setVisiveis(todosVisiveis ? new Set() : new Set(contas.map((c) => c.id)));

  const contaDoDetalhe = contas.find((c) => c.id === detalhe) ?? null;

  return (
    <>
      {/* Faixa fina: o caixa do dia mora em Caixa. Aqui só o que ainda está na
          rua — e sem repetir rótulo quando não há nada em aberto. */}
      <div className="surface-deep flex shrink-0 items-baseline justify-between gap-2 border-b border-border px-5 py-3">
        <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
          <Wifi
            className={cn("size-3", aoVivo ? "text-success" : "text-muted-foreground/40")}
            aria-label={aoVivo ? "Sincronizado ao vivo" : "Sem sincronia ao vivo"}
          />
          {contas.length === 0
            ? "Nenhuma conta aberta"
            : `${contas.length} ${contas.length === 1 ? "conta aberta" : "contas abertas"}`}
        </span>
        {contas.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "money text-2xl leading-none text-warning-foreground transition-[filter] duration-200",
                !todosVisiveis && "select-none blur-[6px]",
              )}
              aria-hidden={!todosVisiveis}
            >
              R$ {brl(pendente)}
            </span>
            <button
              type="button"
              onClick={alternarTodos}
              aria-pressed={todosVisiveis}
              aria-label={todosVisiveis ? "Esconder todos os valores" : "Mostrar todos os valores"}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {todosVisiveis ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        ) : null}
      </div>


      {/* Salão é opcional: só aparece se a loja disse que tem. */}
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="mb-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h2 className="flex min-w-0 items-center gap-2 font-display text-2xl leading-none tracking-wide">
            <UtensilsCrossed className="size-5 shrink-0 text-muted-foreground" />
            <span className="truncate">{config.salaoAtivo ? "Salão" : "Atalhos"}</span>
            {config.salaoAtivo && mesas.length > 0 ? (
              <span className="shrink-0 rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-black tabular-nums">
                {ocupadas}/{mesas.length}
              </span>
            ) : null}
            {!config.salaoAtivo && !editando ? (
              <button
                type="button"
                onClick={() => setDicaSalao((v) => !v)}
                aria-expanded={dicaSalao}
                aria-label="O que são os atalhos"
                className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-primary"
              >
                <Info className="size-4" />
              </button>
            ) : null}
          </h2>
          <button
            onClick={() => setEditando((v) => !v)}
            aria-label="Personalizar salão e atalhos"
            className={cn(
              "press flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-black uppercase tracking-wide transition-colors",
              editando
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card/60 text-muted-foreground hover:border-primary hover:text-foreground",
            )}
          >
            <Settings2 className="size-4" />
            {editando ? "Pronto" : "Personalizar"}
          </button>
        </div>

        {editando ? <EditorSalao /> : null}

        {config.salaoAtivo && mesas.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {mesas.map((m, i) => {
              const u = m.conta && config.cronometroAtivo ? urgencia(m.conta.min, config) : null;
              return (
                <div key={m.label} className="relative">
                  <button
                    style={{ animationDelay: `${Math.min(i, 10) * 18}ms` }}
                    onClick={() =>
                      m.conta ? setDetalhe(m.conta.id) : onNovoDestino(m.label)
                    }
                    title={
                      m.conta
                        ? `${m.label} · R$ ${brl(m.conta.valor)} · ${m.conta.min} min`
                        : `${m.label} livre`
                    }
                    className={cn(
                      "press rise-in relative flex h-[4.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-2xl border-2 transition-colors",
                      m.conta
                        ? u?.cor === "danger"
                          ? "seat-late border-danger/70 bg-danger text-danger-foreground"
                          : "seat-busy border-warning/70 bg-warning text-warning-foreground"
                        : "border-dashed border-border bg-card/50 text-muted-foreground hover:border-primary hover:bg-primary-soft hover:text-foreground",
                      (ativa && m.conta?.id === ativa) || destino === m.label
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-secondary"
                        : "",
                    )}
                  >
                    <span className="money text-[1.6rem] leading-none">{m.numero}</span>
                    <span className="text-[0.625rem] font-black uppercase leading-none tracking-wide opacity-90">
                      {m.conta ? (
                        <span
                          className={cn(
                            "transition-[filter] duration-200",
                            !visivel(m.conta.id) && "select-none blur-[5px]",
                          )}
                        >
                          R$ {brl(m.conta.valor)}
                        </span>
                      ) : (
                        "livre"
                      )}
                    </span>
                    {m.conta && config.cronometroAtivo ? (
                      <span className="absolute -right-1.5 -top-1.5 rounded-full bg-card px-1.5 text-[0.625rem] font-black tabular-nums text-foreground shadow">
                        {m.conta.min}′
                      </span>
                    ) : null}
                  </button>
                  {m.conta ? (
                    <button
                      type="button"
                      onClick={() => alternar(m.conta!.id)}
                      aria-pressed={visivel(m.conta.id)}
                      aria-label={
                        visivel(m.conta.id)
                          ? `Esconder valor de ${m.label}`
                          : `Mostrar valor de ${m.label}`
                      }
                      className="absolute -left-1 -top-1.5 grid size-6 place-items-center rounded-full bg-card text-muted-foreground shadow transition-colors hover:text-foreground"
                    >
                      {visivel(m.conta.id) ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
              );
            })}

          </div>
        ) : null}

        {config.destinos.length > 0 ? (
          <div
            className={cn(
              "grid gap-2",
              config.salaoAtivo && mesas.length > 0 ? "mt-2" : "",
              config.destinos.length > 2 ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {config.destinos.map((d) => (
              <button
                key={d}
                onClick={() => onNovoDestino(d)}
                className={cn(
                  "press h-12 truncate rounded-xl border border-border bg-card/60 px-2 text-xs font-black uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-foreground",
                  destino === d && "border-primary bg-primary-soft text-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        ) : null}

        {!config.salaoAtivo && !editando && dicaSalao ? (
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            Tem mesas na loja? Toque em <strong>Personalizar</strong> e monte o salão do seu jeito.
          </p>
        ) : null}
      </div>

      {/* Contas que não são mesa: nome de gente, delivery, viagem. */}
      <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-muted-foreground">
            {config.salaoAtivo ? "Outras contas" : "Contas abertas"}
          </span>
          <span
            className={cn(
              "money rounded-full px-2.5 py-0.5 text-base leading-tight",
              avulsas.length
                ? "aging-pulse bg-warning text-warning-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {avulsas.length}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Nome do cliente"
            aria-label="Buscar conta aberta"
            className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm font-medium outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        {avulsas.length === 0 ? (
          <p className="m-auto max-w-[14rem] text-center text-sm text-muted-foreground">
            {comandasQuery.isLoading
              ? "Carregando…"
              : filtro
                ? `Ninguém com “${filtro}” em aberto.`
                : config.salaoAtivo
                  ? "Só o salão por aqui. Tudo em ordem 🍦"
                  : "Ninguém devendo agora 🍦"}
          </p>
        ) : (
          avulsas.map((c, i) => {
            const u = config.cronometroAtivo
              ? urgencia(c.min, config)
              : { rotulo: "aberta", cor: "success" as const, peso: 0 };
            const barra =
              u.cor === "danger"
                ? "border-l-danger"
                : u.cor === "warning"
                  ? "border-l-warning"
                  : "border-l-success";
            const chip =
              u.cor === "danger"
                ? "bg-danger text-danger-foreground"
                : u.cor === "warning"
                  ? "bg-warning text-warning-foreground"
                  : "bg-success-soft text-success";
            const qtdItens = c.itens.reduce((s, i2) => s + i2.quantity, 0);
            return (
              <div
                key={c.id}
                style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                className={cn(
                  "rise-in group rounded-xl border border-border border-l-4 bg-card p-3 text-left shadow-sm",
                  "transition-all hover:-translate-y-0.5 hover:shadow-lg",
                  barra,
                  ativa === c.id && "ring-2 ring-primary",
                  u.cor === "danger" && "seat-late",
                )}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <button
                    onClick={() => setDetalhe(c.id)}
                    title={`Ver e editar a conta de ${c.label}`}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 text-left"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-base font-black uppercase leading-none text-foreground/70">
                      {c.label.trim().slice(0, 2)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold leading-tight">{c.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {qtdItens} {qtdItens === 1 ? "item" : "itens"}
                        {config.cronometroAtivo ? ` · há ${c.min} min` : ""}
                      </span>
                    </span>
                  </button>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1">
                      <span
                        className={cn(
                          "money text-xl leading-none transition-[filter] duration-200",
                          !visivel(c.id) && "select-none blur-[5px]",
                        )}
                      >
                        R$ {brl(c.valor)}
                      </span>
                      <button
                        type="button"
                        onClick={() => alternar(c.id)}
                        aria-pressed={visivel(c.id)}
                        aria-label={
                          visivel(c.id)
                            ? `Esconder valor de ${c.label}`
                            : `Mostrar valor de ${c.label}`
                        }
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {visivel(c.id) ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.6875rem] font-bold tabular-nums",
                          chip,
                        )}
                      >
                        {u.rotulo}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandida((v) => (v === c.id ? null : c.id))}
                        aria-expanded={expandida === c.id}
                        aria-label={`Espiar itens de ${c.label}`}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            expandida === c.id && "rotate-180",
                          )}
                        />
                      </button>
                    </span>
                  </span>
                </div>

                {/* O que a pessoa pediu, sem abrir a conta. */}
                {expandida === c.id ? (
                  <ul className="rise-in mt-2 space-y-1 rounded-lg bg-secondary/60 p-2.5 text-xs">
                    {c.itens.length === 0 ? (
                      <li className="text-muted-foreground">Nada lançado ainda.</li>
                    ) : (
                      c.itens.map((it, k) => (
                        <li
                          key={`${it.product_name}-${k}`}
                          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-2"
                        >
                          <span className="money text-sm leading-none text-muted-foreground">
                            {it.quantity}×
                          </span>
                          <span className="truncate font-semibold">{it.product_name}</span>
                          <span className="money text-sm leading-none">
                            R$ {brl(it.unit_price * it.quantity)}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}

                {/* Ações sempre visíveis: quem está no balcão não descobre botão passando o mouse. */}
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                  <button
                    onClick={() => onAbrir(c, true)}
                    className="press rounded-lg bg-success px-2 py-2 text-center text-xs font-black uppercase tracking-wide text-success-foreground hover:glow-success"
                  >
                    Receber R$ {brl(c.valor)}
                  </button>
                  <button
                    onClick={() => onAbrir(c, false)}
                    title="Adicionar mais itens nesta conta"
                    className="press rounded-lg bg-secondary px-3 py-2 text-xs font-bold transition-colors hover:bg-primary-soft"
                  >
                    + Itens
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirmar({
                        titulo: `Cancelar a conta de ${c.label}?`,
                        descricao: "Os itens lançados nessa conta são perdidos.",
                        confirmar: "Cancelar conta",
                      });
                      if (ok) cancelar.mutate(c.id);
                    }}

                    title="Cancelar esta comanda"
                    aria-label={`Cancelar comanda de ${c.label}`}
                    className="press rounded-lg bg-secondary px-2 py-2 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 space-y-1 border-t border-border bg-warning-soft/40 p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="eyebrow text-muted-foreground">Falta receber</span>
          <span className="money text-3xl leading-none text-warning-foreground">
            <span
              className={cn(
                "transition-[filter] duration-200",
                !todosVisiveis && "select-none blur-[5px]",
              )}
            >
              R$ {brl(pendente)}
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {config.salaoAtivo
            ? `Toque num ${config.termoMesa.toLowerCase()} livre para começar; num ocupado para ver a conta.`
            : "Anote a conta com um nome e receba quando o cliente voltar."}
        </p>

      </div>

      {contaDoDetalhe ? (
        <ModalConta
          conta={contaDoDetalhe}
          onFechar={() => setDetalhe(null)}
          onAbrir={onAbrir}
        />
      ) : null}
    </>

  );
}
