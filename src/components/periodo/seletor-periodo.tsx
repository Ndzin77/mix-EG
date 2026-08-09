import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import {
  diaIso,
  intervaloMes,
  intervaloPreset,
  mesDoIntervalo,
  presetDoIntervalo,
  presets,
  rotuloIntervalo,
  rotuloMes,
  rotuloPreset,
  semanaDoIntervalo,
  semanaDoModo,
  semanasDoModo,
  modosSemana,
  rotuloModoSemana,
  type ModoSemana,
  type Intervalo,
} from "@/lib/relatorios";
import { cn } from "@/lib/utils";

const ddmm = (dia: string) => {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
};

/** Mês inteiro respeitando o atalho "Este mês" (que para no dia de hoje). */
function mesInteiro(ano: number, mes: number): Intervalo {
  const hoje = new Date();
  return ano === hoje.getFullYear() && mes === hoje.getMonth()
    ? intervaloPreset("mes")
    : intervaloMes(ano, mes);
}

/**
 * Seletor de período no estilo gerenciador de anúncios: atalhos prontos de um
 * lado, intervalo livre do outro. O botão sempre diz em palavras o que está
 * na tela — a dona nunca precisa lembrar qual filtro deixou ligado.
 */
export function SeletorPeriodo({
  valor,
  onMudar,
}: {
  valor: Intervalo;
  onMudar: (i: Intervalo) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState(valor.de);
  const [ate, setAte] = useState(valor.ate);
  const caixa = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  /** mês cujas semanas estão à mostra (null = ninguém pediu semanas) */
  const [mesBase, setMesBase] = useState<{ ano: number; mes: number } | null>(null);
  const ativo = presetDoIntervalo(valor);
  const hoje = diaIso(new Date());
  /** como a loja quer contar semana: 1–7, do mês (quebra no sábado) ou do ano */
  const [modo, setModo] = useState<ModoSemana>("mes");

  useEffect(() => {
    setDe(valor.de);
    setAte(valor.ate);
  }, [valor.de, valor.ate]);

  /* Abrir já mostrando as semanas quando o período em uso é mensal/semanal. */
  useEffect(() => {
    if (!aberto) return;
    if (ativo === "mes" || ativo === "mesPassado" || semanaDoIntervalo(valor)) {
      setMesBase(mesDoIntervalo(valor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  /* Camada flutuante: nenhum cartão com overflow recorta o calendário. */
  useLayoutEffect(() => {
    if (!aberto) return;
    const medir = () => {
      const r = caixa.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    };
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!caixa.current?.contains(alvo) && !painel.current?.contains(alvo)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const aplicar = () => {
    const [inicio, fim] = de <= ate ? [de, ate] : [ate, de];
    onMudar({ de: inicio, ate: fim });
    setAberto(false);
  };

  const semanas = mesBase ? semanasDoModo(modo, mesBase.ano, mesBase.mes) : [];
  const semanaAtiva = mesBase ? semanaDoModo(modo, valor, mesBase.ano, mesBase.mes) : null;

  return (
    <div ref={caixa} className="no-print relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="press flex h-11 items-center gap-2 rounded-xl border-2 border-border bg-card px-4 text-sm font-bold transition-colors hover:border-primary/60"
      >
        <CalendarRange className="size-4 text-primary" />
        {rotuloIntervalo(valor)}
        <ChevronDown className={cn("size-4 transition-transform", aberto && "rotate-180")} />
      </button>

      {aberto && pos
        ? createPortal(
            <div
              ref={painel}
              style={{ top: pos.top, right: Math.max(pos.right, 16) }}
              className="modal-in fixed z-[60] max-h-[min(32rem,calc(100vh-6rem))] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border-2 border-border bg-card shadow-2xl sm:grid sm:grid-cols-[11rem_minmax(0,1fr)]"
            >
          <ul className="border-b border-border bg-secondary/30 p-2 sm:border-b-0 sm:border-r">
            {presets.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => {
                    onMudar(intervaloPreset(p));
                    if (p === "mes" || p === "mesPassado") {
                      setMesBase(mesDoIntervalo(intervaloPreset(p)));
                      return;
                    }
                    setMesBase(null);
                    setAberto(false);
                  }}
                  className={cn(
                    "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-bold transition-colors",
                    ativo === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {ativo === p ? <Check className="size-4" strokeWidth={3} /> : null}
                  {rotuloPreset[p]}
                </button>
              </li>
            ))}
          </ul>

          <div className="p-4">
            {mesBase ? (
              <div className="mb-4">
                <span className="eyebrow text-muted-foreground">
                  {modo === "ano"
                    ? `Semanas de ${mesBase.ano}`
                    : `Semanas de ${rotuloMes(mesBase.ano, mesBase.mes)}`}
                </span>
                <div className="mt-2 flex gap-1 rounded-xl bg-secondary/40 p-1">
                  {modosSemana.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModo(m)}
                      className={cn(
                        "h-8 flex-1 rounded-lg text-xs font-black uppercase tracking-wide transition-colors",
                        modo === m
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {rotuloModoSemana[m]}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() =>
                      onMudar(
                        modo === "ano"
                          ? { de: `${mesBase.ano}-01-01`, ate: diaIso(new Date()) }
                          : mesInteiro(mesBase.ano, mesBase.mes),
                      )
                    }
                    className={cn(
                      "h-9 rounded-lg px-3 text-left text-xs font-black uppercase tracking-wide transition-colors",
                      !semanaAtiva
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
                    )}
                  >
                    {modo === "ano" ? "Ano inteiro" : "Mês inteiro"}
                  </button>
                  {semanas.map((s) => {
                    const futura = s.de > hoje;
                    const selecionada = semanaAtiva?.n === s.n;
                    return (
                      <button
                        key={s.n}
                        type="button"
                        disabled={futura}
                        onClick={() => onMudar({ de: s.de, ate: s.ate })}
                        className={cn(
                          "flex h-10 items-center justify-between gap-2 rounded-lg border-2 px-3 text-sm font-bold transition-colors",
                          selecionada
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/60",
                          futura && "pointer-events-none opacity-40",
                        )}
                      >
                        <span>Semana {s.n}</span>
                        <span className="money text-xs tabular-nums">
                          {ddmm(s.de)}–{ddmm(s.ate)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <span className="eyebrow text-muted-foreground">Intervalo personalizado</span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-muted-foreground">
                De
                <input
                  type="date"
                  value={de}
                  max={hoje}
                  onChange={(e) => setDe(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border-2 border-border bg-secondary/30 px-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs font-bold text-muted-foreground">
                Até
                <input
                  type="date"
                  value={ate}
                  max={hoje}
                  onChange={(e) => setAte(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border-2 border-border bg-secondary/30 px-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={aplicar}
              className="press mt-3 h-11 w-full rounded-xl bg-primary text-sm font-black uppercase tracking-wide text-primary-foreground"
            >
              Aplicar período
            </button>
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
