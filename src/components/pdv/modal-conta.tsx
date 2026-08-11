import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronDown,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmar } from "@/components/confirmar";
import { Modal } from "@/components/modal";
import { brl } from "@/lib/config";
import { useImagens } from "@/lib/imagens";
import { listarProdutos } from "@/lib/loja.functions";
import { cn } from "@/lib/utils";
import {
  atualizarItemComanda,
  cancelarComanda,
  removerItemComanda,
} from "@/lib/vendas.functions";

import { Foto, type ComandaCard } from "./comum";

/** Só a hora do relógio: é o que o caixa precisa ler de relance. */
const horaDe = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

/** Diferença em dinheiro escrita como o caixa fala: +R$ 4,50 / −R$ 4,50. */
const delta = (v: number) =>
  `${v >= 0 ? "+" : "−"}R$ ${brl(Math.abs(Math.round(v * 100) / 100))}`;

type Item = ComandaCard["itens"][number];

/**
 * Detalhes de uma conta aberta: uma lista, não um monte de cartões.
 * Nada é gravado no toque — a linha entra em edição, mostra a diferença
 * em dinheiro e só então salva.
 */
export function ModalConta({
  conta,
  onFechar,
  onAbrir,
}: {
  conta: ComandaCard;
  onFechar: () => void;
  onAbrir: (c: ComandaCard, receber: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const confirmar = useConfirmar();
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<{ qtd: string; preco: string }>({ qtd: "", preco: "" });
  const [historicoAberto, setHistoricoAberto] = useState(false);
  /** Tudo que foi mexido nesta sessão, com horário — vira o resumo ao fechar. */
  const [alteracoes, setAlteracoes] = useState<{ hora: string; texto: string; valor: number }[]>(
    [],
  );
  const [totalInicial] = useState(() =>
    conta.itens.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0),
  );

  const registrar = (texto: string, valor = 0) =>
    setAlteracoes((a) => [...a, { hora: horaDe(new Date().toISOString()), texto, valor }]);

  const buscarProdutos = useServerFn(listarProdutos);
  const produtosQuery = useQuery({ queryKey: ["produtos"], queryFn: () => buscarProdutos() });
  const urlDe = useImagens((produtosQuery.data ?? []).map((p) => p.image_url));
  const fotoDe = useMemo(() => {
    const mapa = new Map((produtosQuery.data ?? []).map((p) => [p.id, p.image_url ?? null]));
    return (id: string | null) => (id ? (mapa.get(id) ?? null) : null);
  }, [produtosQuery.data]);

  const mudarItem = useServerFn(atualizarItemComanda);
  const tirarItem = useServerFn(removerItemComanda);
  const descartarConta = useServerFn(cancelarComanda);

  const atualizar = () => {
    queryClient.invalidateQueries({ queryKey: ["comandas"] });
    queryClient.invalidateQueries({ queryKey: ["caixa"] });
  };

  const semRede = () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.warning("Sem internet: para editar itens já gravados é preciso conexão.");
      return true;
    }
    return false;
  };

  const salvar = useMutation({
    mutationFn: (v: { item_id: string; quantity: number; unit_price?: number }) =>
      mudarItem({ data: v }),
    onSuccess: () => {
      setEditando(null);
      atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (item_id: string) => tirarItem({ data: { item_id } }),
    onSuccess: () => {
      toast.success("Item removido da conta");
      atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelar = useMutation({
    mutationFn: () => descartarConta({ data: { id: conta.id } }),
    onSuccess: () => {
      toast.success("Conta cancelada");
      atualizar();
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = conta.itens.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
  const pecas = conta.itens.reduce((s, i) => s + Number(i.quantity), 0);
  const pendente = salvar.isPending || remover.isPending || cancelar.isPending;

  const abrirEdicao = (item: Item) => {
    if (!item.id) return;
    setEditando(item.id);
    setRascunho({
      qtd: String(Number(item.quantity)),
      preco: String(Number(item.unit_price)),
    });
  };

  /** − / + agora mexem só no rascunho: nada vai ao banco sem confirmar. */
  const mexerRascunho = (d: number) =>
    setRascunho((r) => {
      const nova = Math.max(0, Math.round((Number(r.qtd || 0) + d) * 1000) / 1000);
      return { ...r, qtd: String(nova) };
    });

  const confirmarEdicao = (item: Item) => {
    if (!item.id || semRede()) return;
    const qtd = Number(rascunho.qtd);
    const preco = Number(rascunho.preco);
    if (!(qtd > 0)) {
      toast.error("Quantidade precisa ser maior que zero.");
      return;
    }
    const antes = Number(item.quantity) * Number(item.unit_price);
    const depois = qtd * (preco >= 0 ? preco : Number(item.unit_price));
    if (qtd === Number(item.quantity) && preco === Number(item.unit_price)) {
      setEditando(null);
      return;
    }
    if (qtd !== Number(item.quantity)) {
      registrar(`${item.product_name}: ${Number(item.quantity)} → ${qtd}`, depois - antes);
    }
    if (preco >= 0 && preco !== Number(item.unit_price)) {
      registrar(
        `${item.product_name}: R$ ${brl(Number(item.unit_price))} → R$ ${brl(preco)} un.`,
        0,
      );
    }
    salvar.mutate({
      item_id: item.id,
      quantity: qtd,
      unit_price: preco >= 0 ? preco : undefined,
    });
  };

  const apagar = async (item: Item) => {
    if (!item.id || semRede()) return;
    const ok = await confirmar({
      titulo: `Tirar ${item.product_name} da conta?`,
      descricao: "O item sai da conta e o total é recalculado na hora.",
      confirmar: "Tirar item",
    });
    if (!ok) return;
    registrar(
      `${item.product_name}: removido`,
      -(Number(item.quantity) * Number(item.unit_price)),
    );
    remover.mutate(item.id);
  };

  /* Fechar sem prestar contas era o buraco: o resumo do que mudou aparece
     antes, com o total de antes e o de agora. */
  const fecharComResumo = async () => {
    if (!alteracoes.length) {
      onFechar();
      return;
    }
    const ok = await confirmar({
      titulo: `${alteracoes.length} ${alteracoes.length === 1 ? "alteração" : "alterações"} nesta conta`,
      descricao: `${alteracoes.map((a) => `${a.hora} ${a.texto}`).join(" · ")} — total de R$ ${brl(totalInicial)} para R$ ${brl(total)}.`,
      confirmar: "Fechar",
    });
    if (ok) onFechar();
  };

  const eventos = [
    ...(conta.opened_at ? [{ hora: horaDe(conta.opened_at), texto: "Conta aberta", valor: 0 }] : []),
    ...conta.itens
      .filter((i) => i.created_at)
      .slice()
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((i) => ({
        hora: horaDe(i.created_at),
        texto: `${Number(i.quantity)}× ${i.product_name}`,
        valor: Number(i.quantity) * Number(i.unit_price),
      })),
    ...alteracoes,
  ];

  return (
    <Modal
      titulo={conta.label}
      subtitulo={[
        `${conta.itens.length} ${conta.itens.length === 1 ? "linha" : "linhas"}`,
        pecas ? `${Number(pecas)} ${pecas === 1 ? "item" : "itens"}` : null,
        conta.min !== undefined ? `aberta há ${conta.min} min` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      onFechar={() => void fecharComResumo()}
      largo
      rodape={
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <button
            onClick={() => {
              onAbrir(conta, true);
              onFechar();
            }}
            className="press glow-success rounded-xl bg-success px-4 py-3 font-display text-xl tracking-wide text-success-foreground"
          >
            Receber R$ {brl(total)}
          </button>
          <button
            onClick={() => {
              onAbrir(conta, false);
              onFechar();
            }}
            className="press rounded-xl bg-secondary px-4 py-3 text-sm font-black uppercase tracking-wide transition-colors hover:bg-primary-soft"
          >
            + Itens
          </button>
          <button
            onClick={async () => {
              const ok = await confirmar({
                titulo: `Cancelar a conta de ${conta.label}?`,
                descricao: "Os itens lançados nessa conta são perdidos.",
                confirmar: "Cancelar conta",
              });
              if (ok) cancelar.mutate();
            }}
            aria-label={`Cancelar conta de ${conta.label}`}
            className="press rounded-xl bg-secondary px-3 py-3 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {conta.itens.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
            Nada lançado nessa conta ainda. Toque em <strong>+ Itens</strong> para começar.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            {/* Cabeçalho da lista: a coluna de valores começa a ser lida aqui. */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-secondary/40 px-3 py-2">
              <span className="eyebrow text-muted-foreground">Item</span>
              <span className="eyebrow text-right text-muted-foreground">Valor</span>
            </div>

            <ul className="divide-y divide-border">
              {conta.itens.map((item, i) => {
                const editar = editando === item.id;
                const subtotal = Number(item.unit_price) * Number(item.quantity);
                const previa =
                  Number(rascunho.qtd || 0) *
                  (Number(rascunho.preco) >= 0 ? Number(rascunho.preco) : Number(item.unit_price));
                return (
                  <li
                    key={item.id ?? `${item.product_name}-${i}`}
                    className={cn("bg-card transition-colors", editar && "bg-primary-soft/40")}
                  >
                    <div
                      role={item.id && !editar ? "button" : undefined}
                      tabIndex={item.id && !editar ? 0 : undefined}
                      onClick={() => !editar && abrirEdicao(item)}
                      onKeyDown={(e) => {
                        if (!editar && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          abrirEdicao(item);
                        }
                      }}
                      className={cn(
                        "grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5",
                        item.id && !editar && "cursor-pointer hover:bg-secondary/40",
                      )}
                    >
                      <Foto
                        produto={{ nome: item.product_name, foto: fotoDe(item.product_id) }}
                        url={urlDe(fotoDe(item.product_id))}
                        className="size-9 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold leading-tight">{item.product_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {Number(item.quantity)}× R$ {brl(Number(item.unit_price))}
                          {item.created_at ? ` · ${horaDe(item.created_at)}` : ""}
                          {item.updated_at &&
                          item.created_at &&
                          item.updated_at !== item.created_at
                            ? ` · editado ${horaDe(item.updated_at)}`
                            : ""}
                          {!item.id ? " · aguardando internet" : ""}
                        </p>
                      </div>
                      <span className="money shrink-0 text-xl leading-none tabular-nums">
                        R$ {brl(subtotal)}
                      </span>
                      {editar ? (
                        <span className="w-[4.5rem]" />
                      ) : (
                        <span className="flex shrink-0 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirEdicao(item);
                            }}
                            disabled={!item.id}
                            aria-label={`Editar ${item.product_name}`}
                            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground disabled:opacity-40"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void apagar(item);
                            }}
                            disabled={!item.id || pendente}
                            aria-label={`Excluir ${item.product_name}`}
                            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </span>
                      )}
                    </div>

                    {editar ? (
                      <div
                        className="space-y-2 border-t border-primary/20 px-3 py-3"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmarEdicao(item);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditando(null);
                          }
                        }}
                      >
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-end gap-2">
                          <div className="flex items-center overflow-hidden rounded-xl border border-border bg-secondary/50">
                            <button
                              onClick={() => mexerRascunho(-1)}
                              aria-label="Menos um no rascunho"
                              className="grid size-11 place-items-center transition-colors hover:bg-danger-soft hover:text-danger"
                            >
                              <Minus className="size-4" />
                            </button>
                            <input
                              type="number"
                              min={0.001}
                              step="1"
                              autoFocus
                              aria-label="Quantidade"
                              value={rascunho.qtd}
                              onChange={(e) =>
                                setRascunho((r) => ({ ...r, qtd: e.target.value }))
                              }
                              className="money h-11 w-14 border-x border-border bg-card text-center text-lg outline-none focus:bg-primary-soft/40"
                            />
                            <button
                              onClick={() => mexerRascunho(1)}
                              aria-label="Mais um no rascunho"
                              className="grid size-11 place-items-center transition-colors hover:bg-success-soft hover:text-success"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                          <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Preço un.
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={rascunho.preco}
                              onChange={(e) =>
                                setRascunho((r) => ({ ...r, preco: e.target.value }))
                              }
                              className="money mt-1 h-11 w-full rounded-xl border-2 border-border bg-card px-3 text-lg outline-none focus:border-primary"
                            />
                          </label>
                          <button
                            onClick={() => confirmarEdicao(item)}
                            disabled={pendente}
                            aria-label="Salvar item"
                            className="press grid size-11 place-items-center rounded-xl bg-success text-success-foreground disabled:opacity-50"
                          >
                            {salvar.isPending ? (
                              <Loader2 className="size-5 animate-spin" />
                            ) : (
                              <Check className="size-5" strokeWidth={3} />
                            )}
                          </button>
                          <button
                            onClick={() => setEditando(null)}
                            aria-label="Cancelar edição"
                            className="press grid size-11 place-items-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-5" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Fica R$ {brl(previa)}
                          {Math.abs(previa - subtotal) > 0.004 ? (
                            <strong
                              className={cn(
                                "ml-1",
                                previa > subtotal ? "text-success" : "text-danger",
                              )}
                            >
                              {delta(previa - subtotal)}
                            </strong>
                          ) : null}{" "}
                          · Enter salva, Esc cancela.
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-baseline justify-between border-t border-border bg-secondary/50 px-4 py-3">
              <span className="eyebrow text-muted-foreground">Total da conta</span>
              <span className="money text-4xl leading-none tabular-nums text-primary">
                R$ {brl(total)}
              </span>
            </div>
          </div>
        )}

        {typeof navigator !== "undefined" && navigator.onLine === false ? (
          <p className="flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs font-bold text-warning-foreground">
            <WifiOff className="size-4 shrink-0" />
            Sem internet: a conta pode ser lida, mas editar itens gravados precisa de conexão.
          </p>
        ) : null}

        {/* Histórico recolhido: só quem quer conferir o que aconteceu abre. */}
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
          <button
            type="button"
            onClick={() => setHistoricoAberto((v) => !v)}
            aria-expanded={historicoAberto}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
          >
            <span className="eyebrow text-muted-foreground">
              Histórico · {eventos.length} {eventos.length === 1 ? "evento" : "eventos"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                historicoAberto && "rotate-180",
              )}
            />
          </button>
          {historicoAberto ? (
            <div className="border-t border-border px-3 py-2">
              <ul className="space-y-1 text-xs">
                {eventos.map((e, k) => (
                  <li key={`ev-${k}`} className="flex gap-2">
                    <span className="money w-12 shrink-0 text-muted-foreground tabular-nums">
                      {e.hora}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{e.texto}</span>
                    {e.valor ? (
                      <span className="money shrink-0 tabular-nums text-muted-foreground">
                        {delta(e.valor)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                {conta.min !== undefined ? `Aberta há ${conta.min} min · ` : ""}
                {Number(pecas)} {pecas === 1 ? "item" : "itens"}
                {pecas ? ` · média de R$ ${brl(total / pecas)} por item` : ""}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
