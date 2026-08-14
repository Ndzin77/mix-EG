import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  HandCoins,
  Loader2,
  Plus,
  Split,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { useConfirmar } from "@/components/confirmar";
import { brl } from "@/lib/config";
import { cent, resumoCobranca, type CobrancaEstado } from "@/lib/cobranca";
import { cn } from "@/lib/utils";
import { cedulas, pagamentos, type FormaPagamento } from "./comum";

export type { CobrancaEstado };

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
    trocoDoado,
  } = estado;

  /* Uma conta só, a mesma que o salvamento usa: o que entrou é o que vale. */
  const resumo = resumoCobranca(bruto, estado);
  const { aPagar, pago, falta, cobrado, diferenca, troco, podeFechar } = resumo;
  const quitado = falta < 0.005;
  const confirmar = useConfirmar();
  /* Desconto agora é uma janelinha por cima do modal: menos informação na tela. */
  const [descontoAberto, setDescontoAberto] = useState(false);
  const campoParcial = useRef<HTMLInputElement>(null);

  const rotulo = (f: FormaPagamento) => pagamentos.find((p) => p.valor === f)?.rotulo ?? f;

  const dinheiro = pagamento === "cash";
  const sugestoes = useMemo(() => {
    if (!dinheiro || aPagar <= 0) return [];
    const dezena = Math.ceil(aPagar / 10) * 10;
    const vals = [dezena, ...cedulas.filter((c) => c > aPagar)];
    return [...new Set(vals.map(cent))].sort((a, b) => a - b).slice(0, 4);
  }, [dinheiro, aPagar]);

  /** Converte o que foi digitado (R$ ou %) no desconto em reais. */
  const aplicarDesconto = (entrada: number | null, modo: "reais" | "percent") => {
    const bruta = entrada ?? 0;
    const reais = modo === "percent" ? cent((bruto * bruta) / 100) : cent(bruta);
    set({
      descontoEntrada: entrada,
      descontoModo: modo,
      desconto: Math.min(bruto, Math.max(0, reais)),
    });
  };

  const removerDesconto = () => {
    set({ descontoAtivo: false, desconto: 0, descontoEntrada: null });
    setDescontoAberto(false);
  };

  const alternarDividir = (ligado: boolean) =>
    ligado
      ? set({ dividir: true, recebido: null, trocoDoado: false })
      : set({ dividir: false, partes: [], parcial: null, recebido: null, trocoDoado: false });

  /* O valor digitado é respeitado — se passar do que falta, a sobra vira
     acréscimo em vez de ser cortada em silêncio. */
  const valorParte = cent(parcial && parcial > 0 ? parcial : falta);

  const adicionarParte = () => {
    if (valorParte <= 0) return;
    set({
      partes: [...partes, { forma: pagamento, valor: valorParte }],
      parcial: null,
      recebido: null,
    });
  };

  /* Botão principal quando ainda falta: encaixa o que falta, ou leva o foco
     para o campo com o valor já preenchido. Nada entra sozinho ao confirmar. */
  const encaixarFalta = () => {
    if (falta <= 0.005) return;
    if (parcial && parcial > 0) {
      adicionarParte();
      return;
    }
    set({ parcial: cent(falta) });
    requestAnimationFrame(() => campoParcial.current?.focus());
  };

  const removerParte = (i: number) =>
    set({ partes: partes.filter((_, k) => k !== i), recebido: null });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (descontoAberto) setDescontoAberto(false);
        else onFechar();
        return;
      }
      /* Janelinha do desconto manda no teclado enquanto está aberta. */
      if (descontoAberto) return;
      if (digitando(e.target)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (dividir && !podeFechar) encaixarFalta();
        else void confirmarComAviso();
      } else if (e.key === "+") {
        e.preventDefault();
        if (dividir) adicionarParte();
      } else {
        const forma = pagamentos.find((p) => p.tecla === e.key);
        if (forma) set({ pagamento: forma.valor, recebido: null, trocoDoado: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const informado = cent(recebido ?? aPagar);

  /* Um aviso só: produtos, o que entrou e para onde vai a diferença. */
  const confirmarComAviso = async () => {
    if (pendente) return;
    if (Math.abs(diferenca) >= 0.005) {
      const aMais = diferenca > 0;
      const ok = await confirmar({
        titulo: aMais ? `Sobra de R$ ${brl(diferenca)}` : `Falta R$ ${brl(Math.abs(diferenca))}`,
        descricao: `Produtos R$ ${brl(aPagar)} · recebido R$ ${brl(cobrado)} — a diferença entra como ${
          aMais ? "acréscimo" : "desconto"
        } e a venda fecha em R$ ${brl(cobrado)}.`,
        confirmar: "Fechar assim",
      });
      if (!ok) return;
    }
    onConfirmar();
  };

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
          {Math.abs(diferenca) >= 0.005 ? (
            /* Faixa fina: a diferença aparece, sem pop-up e sem repetição. */
            <p
              className={cn(
                "mt-2 text-sm font-bold",
                diferenca > 0 ? "text-success" : "text-danger",
              )}
            >
              {diferenca > 0
                ? `Acréscimo de R$ ${brl(diferenca)} — fecha em R$ ${brl(cobrado)}`
                : `R$ ${brl(Math.abs(diferenca))} a menos — fecha em R$ ${brl(cobrado)}`}
            </p>
          ) : null}
        </div>

        {/* Desconto abre uma janelinha; dividir é uma chave. O corpo fica limpo. */}
        <div className="mt-4 grid grid-cols-2 gap-2 px-6">
          <button
            onClick={() => {
              set({ descontoAtivo: true });
              setDescontoAberto(true);
            }}
            className={cn(
              "press flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-black uppercase tracking-wide transition-colors",
              desconto > 0
                ? "border-primary bg-primary-soft text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50",
            )}
          >
            <TicketPercent className="size-4" />
            Desconto
            {desconto > 0 ? (
              <span className="money ml-auto text-base leading-none text-danger">
                − {brl(desconto)}
              </span>
            ) : null}
          </button>

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

        {descontoAberto ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Desconto"
            className="overlay-in fixed inset-0 z-[60] grid place-items-center bg-foreground/50 p-4"
            onClick={() => setDescontoAberto(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="modal-in w-full max-w-sm rounded-3xl border-2 border-primary/30 bg-card p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow text-muted-foreground">Desconto</p>
                  <p className="money text-2xl leading-none text-danger">− R$ {brl(desconto)}</p>
                </div>
                <p className="money text-right text-sm text-muted-foreground">
                  fica R$ {brl(aPagar)}
                </p>
              </div>
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
                  autoFocus
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
              <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                <button
                  onClick={removerDesconto}
                  className="press rounded-xl border-2 border-border px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground hover:border-danger hover:text-danger"
                >
                  Remover
                </button>
                <button
                  onClick={() => setDescontoAberto(false)}
                  className="press rounded-xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground"
                >
                  Aplicar
                </button>
              </div>
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

            {/* Encaixe parcial: digita o valor que entra agora, o resto fica na conta.
                Um campo só — o de "valor recebido" sai de cena enquanto divide. */}
            {dividir ? (
              <div className="px-6 pt-3">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  autoFocus
                  ref={campoParcial}
                  value={parcial ?? ""}
                  onChange={(e) =>
                    set({
                      parcial: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      recebido: null,
                    })
                  }
                  placeholder={`Valor desta parte · falta R$ ${brl(falta)}`}
                  aria-label="Valor desta parte do pagamento"
                  className="money h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-2xl outline-none focus:border-primary focus:bg-card"
                />
                {falta > 0.005 ? (
                  <button
                    onClick={() => set({ parcial: cent(falta) })}
                    className="press mt-2 w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    Usar o que falta · R$ {brl(falta)} em {rotulo(pagamento).toLowerCase()}
                  </button>
                ) : null}
                <button
                  onClick={adicionarParte}
                  className="press mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary-soft text-sm font-black uppercase tracking-wide"
                >
                  <Plus className="size-5" />
                  Encaixar {brl(valorParte)} em {rotulo(pagamento).toLowerCase()}
                  <span className="kbd">+</span>
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {!dividir ? (
          <div className="px-6 pt-4">
            {/* Sem dividir, o campo vale para a forma escolhida — dinheiro, PIX ou cartão. */}
            <>
              <p className="eyebrow mb-2 text-muted-foreground">
                {dinheiro
                  ? `Quanto o cliente deu em dinheiro? (R$ ${brl(aPagar)})`
                  : `Quanto entrou em ${rotulo(pagamento).toLowerCase()}? (R$ ${brl(aPagar)})`}
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
                placeholder={`Digite o valor · R$ ${brl(aPagar)}`}
                aria-label={`Valor pago em ${rotulo(pagamento).toLowerCase()}`}
                className="money h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-2xl outline-none focus:border-success focus:bg-card"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => set({ recebido: aPagar, trocoDoado: false })}
                  className="press rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-success hover:text-foreground"
                >
                  Certo
                </button>
                {dinheiro
                  ? sugestoes.map((v) => (
                      <button
                        key={v}
                        onClick={() => set({ recebido: v })}
                        className="money press rounded-lg border border-border bg-card px-3 py-1.5 text-sm leading-none text-muted-foreground hover:border-success hover:text-foreground"
                      >
                        {brl(v)}
                      </button>
                    ))
                  : null}
              </div>
            </>

            {/* Troco só em dinheiro. Nas outras formas, o que passa vira acréscimo. */}
            {dinheiro && troco > 0.005 ? (
              <div
                key={informado}
                className="troco-pop glow-success mt-3 rounded-2xl bg-success-soft px-5 py-4"
              >
                <div className="flex items-baseline justify-between">
                  <span className="eyebrow text-foreground/60">Troco</span>
                  <span className="money text-5xl leading-none text-success">R$ {brl(troco)}</span>
                </div>
                <button
                  onClick={() => set({ trocoDoado: true })}
                  className="press mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-success bg-card px-3 py-2 text-xs font-black uppercase tracking-wide text-success"
                >
                  <HandCoins className="size-4" />
                  Cliente deixou o troco
                </button>
              </div>
            ) : null}

            {dinheiro && trocoDoado && informado > aPagar + 0.005 ? (
              <button
                onClick={() => set({ trocoDoado: false })}
                className="press mt-3 w-full rounded-2xl bg-success-soft px-5 py-4 text-left"
              >
                <span className="eyebrow text-foreground/60">Troco deixado na loja</span>
                <span className="money ml-2 text-2xl leading-none text-success">
                  R$ {brl(cent(informado - aPagar))}
                </span>
                <span className="ml-2 text-xs font-bold text-muted-foreground">
                  toque para devolver
                </span>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 border-t border-border bg-secondary/40 p-5">
          {/* Uma linha só, sempre visível: o que a conta vale, o que já entrou
              e o que ainda falta — para o botão verde nunca surpreender. */}
          {dividir ? (
            <p className="mb-3 text-sm font-bold text-muted-foreground">
              Produtos R$ {brl(aPagar)} · Encaixado R$ {brl(pago)} ·{" "}
              {falta > 0.005 ? (
                <span className="text-warning-foreground">Falta R$ {brl(falta)}</span>
              ) : diferenca > 0.005 ? (
                <span className="text-success">Sobra R$ {brl(diferenca)}</span>
              ) : (
                <span className="text-success">Conta fechada</span>
              )}
            </p>
          ) : null}

          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <button
              onClick={onFechar}
              className="press rounded-2xl px-6 text-base font-bold text-muted-foreground hover:text-foreground"
            >
              Voltar <span className="kbd">Esc</span>
            </button>
            {podeFechar ? (
              <button
                onClick={() => void confirmarComAviso()}
                disabled={pendente}
                className="press glow-success flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl bg-success font-display text-3xl tracking-wider text-success-foreground disabled:opacity-50"
              >
                {pendente ? (
                  <Loader2 className="size-8 animate-spin" />
                ) : (
                  <>
                    <Check className="size-8" strokeWidth={3} />
                    Confirmar R$ {brl(cobrado)}
                    <span className="kbd">Enter</span>
                  </>
                )}
              </button>
            ) : (
              /* Falta dinheiro: o botão encaixa a parte, nunca fecha escondido. */
              <button
                onClick={encaixarFalta}
                className="press flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl border-2 border-warning bg-warning-soft font-display text-2xl tracking-wide text-warning-foreground"
              >
                <ArrowRight className="size-7" strokeWidth={3} />
                Falta R$ {brl(falta)}
                <span className="kbd">Enter</span>
              </button>
            )}
          </div>

          {/* Fechar com menos do que a conta é decisão explícita, com aviso. */}
          {!podeFechar && partes.length > 0 && falta > 0.005 ? (
            <button
              onClick={() => void confirmarComAviso()}
              disabled={pendente}
              className="press mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-black uppercase tracking-wide text-muted-foreground hover:border-danger hover:text-danger disabled:opacity-50"
            >
              Fechar assim com desconto de R$ {brl(falta)}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
