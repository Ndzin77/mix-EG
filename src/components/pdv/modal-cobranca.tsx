import { useEffect, useMemo } from "react";
import { Check, Loader2, Plus, Split, TicketPercent, Trash2, X } from "lucide-react";
import { brl } from "@/lib/config";
import { cn } from "@/lib/utils";
import { cedulas, pagamentos, type FormaPagamento, type PartePagamento } from "./comum";

export type CobrancaEstado = {
  /** forma escolhida para a próxima parte */
  pagamento: FormaPagamento;
  /** desconto sempre em reais — é assim que vai para o banco */
  desconto: number;
  /** chave do bloco de desconto: fechada, o modal fica com uma linha só */
  descontoAtivo: boolean;
  descontoModo: "reais" | "percent";
  /** o número que a pessoa digitou, no modo escolhido */
  descontoEntrada: number | null;
  /** chave da conta dividida: quem paga numa forma só não vê nada disso */
  dividir: boolean;
  /** partes já encaixadas: dinheiro + PIX + cartão, quantas o cliente quiser */
  partes: PartePagamento[];
  /** valor digitado para a próxima parte (vazio = tudo que falta) */
  parcial: number | null;
  recebido: number | null;
};

const cent = (n: number) => Math.round(n * 100) / 100;

/** Digitando num campo, o teclado é do campo: 1-2-3-4 viram número, não
 *  atalho de forma de pagamento. */
const digitando = (alvo: EventTarget | null) => {
  const el = alvo as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

/**
 * Pop-up de cobrança: uma decisão por vez, com o troco em tamanho de outdoor.
 * Desconto e conta dividida ficam recolhidos em chaves — o caso comum é
 * valor, forma e confirmar, sem rolagem.
 */
export function ModalCobranca({
  bruto,
  alvo,
  estado,
  set,
  pendente,
  onFechar,
  onConfirmar,
}: {
  bruto: number;
  alvo: string | null;
  estado: CobrancaEstado;
  set: (patch: Partial<CobrancaEstado>) => void;
  pendente: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
}) {
  const {
    pagamento,
    desconto,
    descontoAtivo,
    descontoModo,
    descontoEntrada,
    dividir,
    partes,
    parcial,
    recebido,
  } = estado;

  const aPagar = Math.max(0, cent(bruto - desconto));
  const pago = cent(partes.reduce((s, p) => s + p.valor, 0));
  const falta = Math.max(0, cent(aPagar - pago));
  const quitado = falta < 0.005;

  const rotulo = (f: FormaPagamento) => pagamentos.find((p) => p.valor === f)?.rotulo ?? f;

  /* Só a parte em dinheiro pede troco — inclusive o que ainda falta,
     quando o operador vai fechar direto na forma selecionada. */
  const emDinheiro = cent(
    partes.filter((p) => p.forma === "cash").reduce((s, p) => s + p.valor, 0) +
      (!quitado && pagamento === "cash" ? falta : 0),
  );

  const sugestoes = useMemo(() => {
    if (emDinheiro <= 0) return [];
    const dezena = Math.ceil(emDinheiro / 10) * 10;
    const vals = [dezena, ...cedulas.filter((c) => c > emDinheiro)];
    return [...new Set(vals.map(cent))].sort((a, b) => a - b).slice(0, 4);
  }, [emDinheiro]);

  /** Converte o que foi digitado (R$ ou %) no desconto em reais. */
  const aplicarDesconto = (entrada: number | null, modo: "reais" | "percent") => {
    const bruta = entrada ?? 0;
    const reais = modo === "percent" ? cent((bruto * bruta) / 100) : cent(bruta);
    set({
      descontoEntrada: entrada,
      descontoModo: modo,
      desconto: Math.min(bruto, Math.max(0, reais)),
      partes: [],
      recebido: null,
    });
  };

  const alternarDesconto = (ligado: boolean) =>
    ligado
      ? set({ descontoAtivo: true })
      : set({
          descontoAtivo: false,
          desconto: 0,
          descontoEntrada: null,
          partes: [],
          recebido: null,
        });

  const alternarDividir = (ligado: boolean) =>
    ligado ? set({ dividir: true }) : set({ dividir: false, partes: [], parcial: null, recebido: null });

  const adicionarParte = () => {
    const valor = cent(Math.min(parcial && parcial > 0 ? parcial : falta, falta));
    if (valor <= 0) return;
    set({ partes: [...partes, { forma: pagamento, valor }], parcial: null, recebido: null });
  };

  const removerParte = (i: number) =>
    set({ partes: partes.filter((_, k) => k !== i), recebido: null });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
        return;
      }
      if (digitando(e.target)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirmar();
      } else if (e.key === "+") {
        e.preventDefault();
        if (dividir) adicionarParte();
      } else {
        const forma = pagamentos.find((p) => p.tecla === e.key);
        if (forma) set({ pagamento: forma.valor, recebido: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const troco = recebido !== null ? Math.max(0, cent(recebido - emDinheiro)) : null;
  const faltou = recebido !== null && recebido < emDinheiro - 0.005;
  const equivalente =
    descontoModo === "percent"
      ? `− R$ ${brl(desconto)}`
      : bruto > 0
        ? `${Math.round((desconto / bruto) * 100)}% do total`
        : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cobrança"
      className="overlay-in fixed inset-0 z-50 grid place-items-center bg-foreground/45 p-4"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border-2 border-primary/30 bg-card shadow-2xl"
      >
        <div className="money-bar sticky top-0 h-1.5" />
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-5">
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">Cobrar</p>
            <h2 className="truncate font-display text-3xl leading-tight tracking-wide">
              {alvo ?? "Balcão"}
            </h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar cobrança"
            className="press grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6">
          {desconto > 0 ? (
            <p className="text-sm font-bold text-muted-foreground line-through">R$ {brl(bruto)}</p>
          ) : null}
          <p className="money text-5xl leading-none text-primary">R$ {brl(aPagar)}</p>
          {dividir && partes.length ? (
            <p
              className={cn(
                "money mt-1 text-xl leading-none",
                quitado ? "text-success" : "text-warning-foreground",
              )}
            >
              {quitado ? "Conta fechada" : `Falta R$ ${brl(falta)}`}
            </p>
          ) : null}
        </div>

        {/* Duas chaves: desconto e conta dividida. Desligadas, somem da tela. */}
        <div className="mt-4 grid grid-cols-2 gap-2 px-6">
          <label
            className={cn(
              "press flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-black uppercase tracking-wide transition-colors",
              descontoAtivo
                ? "border-primary bg-primary-soft text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50",
            )}
          >
            <input
              type="checkbox"
              checked={descontoAtivo}
              onChange={(e) => alternarDesconto(e.target.checked)}
              className="size-4 accent-[hsl(var(--primary))]"
            />
            <TicketPercent className="size-4" />
            Desconto
            {desconto > 0 ? (
              <span className="money ml-auto text-base leading-none text-danger">
                − {brl(desconto)}
              </span>
            ) : null}
          </label>

          <label
            className={cn(
              "press flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-black uppercase tracking-wide transition-colors",
              dividir
                ? "border-primary bg-primary-soft text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50",
            )}
          >
            <input
              type="checkbox"
              checked={dividir}
              onChange={(e) => alternarDividir(e.target.checked)}
              className="size-4 accent-[hsl(var(--primary))]"
            />
            <Split className="size-4" />
            Dividir pagamento
          </label>
        </div>

        {descontoAtivo ? (
          <div className="rise-in mt-2 rounded-2xl border border-border bg-secondary/30 p-3 mx-6">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <div className="flex overflow-hidden rounded-xl border-2 border-border">
                {(["reais", "percent"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => aplicarDesconto(descontoEntrada, m)}
                    className={cn(
                      "h-12 w-12 text-sm font-black transition-colors",
                      descontoModo === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "reais" ? "R$" : "%"}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                step={descontoModo === "percent" ? 1 : 0.5}
                value={descontoEntrada ?? ""}
                onChange={(e) =>
                  aplicarDesconto(
                    e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                    descontoModo,
                  )
                }
                placeholder={descontoModo === "percent" ? "Quantos %" : "Quantos reais"}
                aria-label="Valor do desconto"
                className="money h-12 rounded-xl border-2 border-border bg-card px-3 text-lg outline-none focus:border-primary"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {[5, 10, 15].map((p) => (
                <button
                  key={p}
                  onClick={() => aplicarDesconto(p, "percent")}
                  className={cn(
                    "press h-9 flex-1 rounded-lg border text-xs font-black uppercase tracking-wide transition-colors",
                    descontoModo === "percent" && descontoEntrada === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/60",
                  )}
                >
                  {p}%
                </button>
              ))}
              <span className="money ml-auto text-sm text-muted-foreground">{equivalente}</span>
            </div>
          </div>
        ) : null}

        {/* Partes já encaixadas. */}
        {dividir && partes.length ? (
          <div className="rise-in mt-4 space-y-2 px-6">
            {partes.map((p, i) => (
              <div
                key={`${p.forma}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-success/40 bg-success-soft px-4 py-2.5"
              >
                <Check className="size-4 shrink-0 text-success" strokeWidth={3} />
                <span className="text-sm font-black uppercase tracking-wide">
                  {rotulo(p.forma)}
                </span>
                <span className="money ml-auto text-xl leading-none">R$ {brl(p.valor)}</span>
                <button
                  onClick={() => removerParte(i)}
                  aria-label={`Remover parte em ${rotulo(p.forma)}`}
                  className="press rounded-lg p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {!quitado ? (
          <>
            <div className="grid grid-cols-4 gap-2 px-6 pt-4">
              {pagamentos.map((m) => (
                <button
                  key={m.valor}
                  onClick={() => set({ pagamento: m.valor, recebido: null })}
                  className={cn(
                    "press relative flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-xs font-black uppercase tracking-wide transition-colors",
                    pagamento === m.valor
                      ? "glow-primary border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  <m.icone className="size-6" />
                  {m.rotulo}
                  <span className="kbd absolute right-1.5 top-1.5">{m.tecla}</span>
                </button>
              ))}
            </div>

            {/* Encaixe parcial: digita quanto entra agora, o resto continua na conta. */}
            {dividir ? (
              <div className="px-6 pt-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input
                    type="number"
                    min={0}
                    max={falta}
                    step="0.5"
                    value={parcial ?? ""}
                    onChange={(e) =>
                      set({
                        parcial: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                        recebido: null,
                      })
                    }
                    placeholder={`Quanto entra agora · falta R$ ${brl(falta)}`}
                    aria-label="Valor desta parte do pagamento"
                    className="money h-14 rounded-xl border-2 border-border bg-secondary/30 px-4 text-lg outline-none focus:border-primary focus:bg-card"
                  />
                  <button
                    onClick={adicionarParte}
                    className="press flex h-14 items-center gap-2 rounded-xl border-2 border-primary bg-primary-soft px-4 text-xs font-black uppercase tracking-wide"
                  >
                    <Plus className="size-4" />
                    Encaixar parte
                    <span className="kbd">+</span>
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  O que sobrar sai em {rotulo(pagamento).toLowerCase()} ao confirmar.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {emDinheiro > 0 ? (
          <div className="px-6 pt-4">
            <p className="eyebrow mb-2 text-muted-foreground">
              Quanto o cliente deu em dinheiro? (R$ {brl(emDinheiro)})
            </p>
            <input
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              value={recebido ?? ""}
              onChange={(e) =>
                set({
                  recebido: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                })
              }
              placeholder={`Digite o valor recebido · R$ ${brl(emDinheiro)}`}
              aria-label="Valor recebido em dinheiro"
              className="money h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-2xl outline-none focus:border-success focus:bg-card"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => set({ recebido: emDinheiro })}
                className="press rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-success hover:text-foreground"
              >
                Certo
              </button>
              {sugestoes.map((v) => (
                <button
                  key={v}
                  onClick={() => set({ recebido: v })}
                  className="money press rounded-lg border border-border bg-card px-3 py-1.5 text-sm leading-none text-muted-foreground hover:border-success hover:text-foreground"
                >
                  {brl(v)}
                </button>
              ))}
            </div>
            {recebido !== null ? (
              <div
                key={recebido}
                className={cn(
                  "troco-pop mt-3 flex items-baseline justify-between rounded-2xl px-5 py-4",
                  faltou ? "bg-danger-soft" : "glow-success bg-success-soft",
                )}
              >
                <span className="eyebrow text-foreground/60">{faltou ? "Falta" : "Troco"}</span>
                <span
                  className={cn(
                    "money text-5xl leading-none",
                    faltou ? "text-danger" : "text-success",
                  )}
                >
                  R$ {brl(faltou ? emDinheiro - recebido : (troco ?? 0))}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-border bg-secondary/40 p-5">
          <button
            onClick={onFechar}
            className="press rounded-2xl px-6 text-base font-bold text-muted-foreground hover:text-foreground"
          >
            Voltar <span className="kbd">Esc</span>
          </button>
          <button
            onClick={onConfirmar}
            disabled={pendente}
            className="press glow-success flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl bg-success font-display text-3xl tracking-wider text-success-foreground disabled:opacity-50"
          >
            {pendente ? (
              <Loader2 className="size-8 animate-spin" />
            ) : (
              <>
                <Check className="size-8" strokeWidth={3} />
                Confirmar
                <span className="kbd">Enter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
