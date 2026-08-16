import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, ReceiptText, Search } from "lucide-react";
import { SeletorPeriodo } from "@/components/periodo/seletor-periodo";
import { brl } from "@/lib/config";
import { rotuloForma, type Intervalo } from "@/lib/relatorios";
import { listarVendas } from "@/lib/vendas.functions";
import { cn } from "@/lib/utils";

const dataHora = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { timeStyle: "short" })}`;
};

/** Histórico de vendas com filtro próprio: período, busca, forma de pagamento
 *  e ordem. Consulta pontual — fica recolhido até alguém precisar. */
export function HistoricoVendas({
  periodoPadrao,
  onAbrir,
  abrindo,
}: {
  periodoPadrao: Intervalo;
  onAbrir: (id: string) => void;
  abrindo: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [periodo, setPeriodo] = useState<Intervalo>(periodoPadrao);
  const [busca, setBusca] = useState("");
  const [forma, setForma] = useState("todas");
  const [ordem, setOrdem] = useState<"recente" | "valor">("recente");
  const buscarHistorico = useServerFn(listarVendas);

  useEffect(() => setPeriodo(periodoPadrao), [periodoPadrao]);

  const { data, isPending } = useQuery({
    queryKey: ["historico", periodo.de, periodo.ate],
    enabled: aberto,
    queryFn: () => {
      const fim = new Date(`${periodo.ate}T00:00:00`);
      fim.setDate(fim.getDate() + 1);
      return buscarHistorico({
        data: {
          de: new Date(`${periodo.de}T00:00:00`).toISOString(),
          ate: fim.toISOString(),
          limite: 200,
        },
      });
    },
  });

  const vendas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = (data ?? []).filter(
      (v) =>
        (forma === "todas" || (v.payment_method ?? "other") === forma) &&
        (!termo || (v.label ?? "").toLowerCase().includes(termo)),
    );
    return ordem === "valor"
      ? [...lista].sort((a, b) => b.total - a.total)
      : [...lista].sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""));
  }, [data, busca, forma, ordem]);

  const total = vendas.reduce((s, v) => s + v.total, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <ChevronDown
          className={cn("size-5 shrink-0 text-primary transition-transform", aberto && "rotate-180")}
        />
        <h2 className="font-display text-lg tracking-wide">Histórico de vendas</h2>
        <span className="ml-auto text-xs font-bold text-muted-foreground">
          {!aberto ? "abrir" : isPending ? "carregando…" : `${vendas.length} · R$ ${brl(total)}`}
        </span>
      </button>

      {aberto ? (
        <>
          <div className="grid grid-cols-2 gap-2 border-t border-border bg-secondary/25 px-5 py-3 md:grid-cols-4">
            <div className="col-span-2 min-w-0 md:col-span-4 lg:col-span-2">
              <SeletorPeriodo valor={periodo} onMudar={setPeriodo} />
            </div>

            <label className="relative col-span-2 min-w-0 md:col-span-4 lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conta ou cliente"
                className="h-11 w-full rounded-xl border-2 border-border bg-card pl-9 pr-3 text-sm font-bold outline-none focus:border-primary"
              />
            </label>

            <select
              value={forma}
              onChange={(e) => setForma(e.target.value)}
              className="col-span-1 h-11 min-w-0 rounded-xl border-2 border-border bg-card px-3 text-sm font-bold outline-none focus:border-primary md:col-span-2"
            >
              <option value="todas">Todas as formas</option>
              {Object.entries(rotuloForma).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as "recente" | "valor")}
              className="col-span-1 h-11 min-w-0 rounded-xl border-2 border-border bg-card px-3 text-sm font-bold outline-none focus:border-primary md:col-span-2"
            >
              <option value="recente">Mais recente</option>
              <option value="valor">Maior valor</option>
            </select>
          </div>


          {isPending ? (
            <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
              Carregando…
            </p>
          ) : vendas.length === 0 ? (
            <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhuma venda com esse filtro.
            </p>
          ) : (
            <ul className="max-h-[24rem] overflow-y-auto overscroll-contain border-t border-border">
              {vendas.map((v) => (
                <li key={v.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onAbrir(v.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-accent/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold leading-tight">{v.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {v.closed_at ? dataHora(v.closed_at) : "—"} ·{" "}
                        {rotuloForma[v.payment_method ?? "other"] ?? "—"}
                      </span>
                    </span>
                    <span className="money text-lg leading-none tabular-nums">
                      R$ {brl(v.total)}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold">
                      {abrindo === v.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ReceiptText className="size-4" />
                      )}
                      Recibo
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
