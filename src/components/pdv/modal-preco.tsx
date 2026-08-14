import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Pencil, Scale } from "lucide-react";
import { Modal } from "@/components/modal";
import { brl } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Foto, modoDoProduto, type Produto, type Sabor } from "./comum";

/** O que a venda precisa saber depois que o preço foi resolvido. */
export type PrecoResolvido = {
  /** preço unitário desta linha */
  preco: number;
  /** nome que vai para a conta e para o recibo */
  rotulo: string;
  /** quantidade da linha (peso vira 1 embalagem já pesada) */
  qtd: number;
  /** quando existe, linhas iguais se somam por esta chave (sabor de preço fixo) */
  chave?: string;
};

const so = (v: string) => v.replace(/[^\d,.]/g, "").replace(".", ",");
const num = (v: string) => Number(v.replace(",", ".")) || 0;

const notas = [5, 10, 15, 20, 25, 30];
const pesos = [100, 200, 300, 500, 750, 1000];

const modoDoSabor = (s: Sabor) => s.modo ?? "fixed";

/**
 * Uma pergunta por vez: qual sabor, quanto custa ou quantos gramas.
 * Um sabor também pode cobrar do seu jeito — aí o mesmo modal dá o segundo
 * passo (valor ou gramas) sem perder o sabor escolhido.
 */
export function ModalPreco({
  produto,
  url,
  onFechar,
  onConfirmar,
}: {
  produto: Produto;
  url?: string;
  onFechar: () => void;
  onConfirmar: (r: PrecoResolvido) => void;
}) {
  const base = modoDoProduto(produto);
  const sabores = produto.sabores ?? [];

  /** sabor escolhido que ainda pede um segundo passo */
  const [sabor, setSabor] = useState<Sabor | null>(null);
  const modo = sabor ? modoDoSabor(sabor) : base;

  const [valor, setValor] = useState(
    base === "manual" && produto.preco > 0 ? brl(produto.preco) : "",
  );
  const [gramas, setGramas] = useState("");
  const campoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoRef.current?.focus();
  }, [modo]);

  const precoKg = (sabor ? sabor.precoKg : produto.precoKg) ?? 0;
  const g = Number(gramas.replace(/\D/g, "")) || 0;
  const totalPeso = useMemo(() => Math.round((g / 1000) * precoKg * 100) / 100, [g, precoKg]);
  const totalManual = num(valor);

  const pronto = modo === "weight" ? g > 0 && precoKg > 0 : totalManual > 0;
  const nomeBase = sabor ? `${produto.nome} — ${sabor.nome}` : produto.nome;

  const voltar = () => {
    setSabor(null);
    setValor("");
    setGramas("");
  };

  const confirmar = () => {
    if (!pronto) return;
    if (modo === "weight") {
      onConfirmar({ preco: totalPeso, rotulo: `${nomeBase} · ${g} g`, qtd: 1 });
    } else {
      onConfirmar({ preco: totalManual, rotulo: nomeBase, qtd: 1 });
    }
  };

  const escolherSabor = (s: Sabor) => {
    const m = modoDoSabor(s);
    if (m === "fixed") {
      onConfirmar({ preco: s.preco, rotulo: `${produto.nome} — ${s.nome}`, qtd: 1 });
      return;
    }
    setSabor(s);
    setValor("");
    setGramas("");
  };

  return (
    <Modal
      titulo={
        modo === "flavor" ? "Qual sabor?" : modo === "weight" ? "Quantos gramas?" : "Qual o valor?"
      }
      subtitulo={nomeBase}
      onFechar={onFechar}
      rodape={
        modo === "flavor" ? undefined : (
          <>
            <button
              type="button"
              onClick={confirmar}
              disabled={!pronto}
              className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground shadow-lg disabled:opacity-40"
            >
              <Check className="size-5" />
              Adicionar por R$ {brl(modo === "weight" ? totalPeso : totalManual)}
            </button>
            <button
              type="button"
              onClick={sabor ? voltar : onFechar}
              className="press h-14 rounded-xl border-2 border-border px-5 font-bold text-muted-foreground"
            >
              {sabor ? "Voltar aos sabores" : "Cancelar"}
            </button>
          </>
        )
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <Foto produto={produto} url={url} className="size-14 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">{nomeBase}</p>
          <p className="truncate text-xs text-muted-foreground">
            {modo === "weight"
              ? `R$ ${brl(precoKg)} por quilo`
              : modo === "flavor"
                ? `${sabores.length} ${sabores.length === 1 ? "sabor" : "sabores"} cadastrados`
                : "Preço definido na hora da venda"}
          </p>
        </div>
      </div>

      {sabor ? (
        <button
          type="button"
          onClick={voltar}
          className="press mb-3 flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Voltar aos sabores
        </button>
      ) : null}

      {modo === "flavor" ? (
        sabores.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum sabor cadastrado neste produto — abra o Admin e adicione o primeiro.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {sabores.map((s) => {
              const m = modoDoSabor(s);
              return (
                <button
                  key={s.nome}
                  type="button"
                  onClick={() => escolherSabor(s)}
                  className="press flex min-h-[4.5rem] items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card px-4 text-left hover:border-primary hover:bg-primary-soft"
                >
                  <span className="min-w-0 flex-1 truncate text-base font-bold">{s.nome}</span>
                  {m === "fixed" ? (
                    <span className="money shrink-0 text-2xl leading-none text-primary">
                      R$ {brl(s.preco)}
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      {m === "weight" ? (
                        <>
                          <Scale className="size-4" />
                          R$ {brl(s.precoKg ?? 0)} / kg
                        </>
                      ) : (
                        <>
                          <Pencil className="size-4" />
                          preço na hora
                        </>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )
      ) : modo === "weight" ? (
        <>
          <label className="block text-sm font-bold" htmlFor="gramas">
            Peso em gramas
          </label>
          <div className="relative mt-1.5">
            <Scale className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="gramas"
              ref={campoRef}
              inputMode="numeric"
              value={gramas}
              onChange={(e) => setGramas(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
              placeholder="0"
              className="money h-20 w-full rounded-2xl border-2 border-border bg-secondary/30 pl-12 pr-14 text-4xl outline-none focus:border-primary focus:bg-card"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
              g
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {pesos.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setGramas(String(p))}
                className={cn(
                  "press h-12 rounded-xl border-2 text-sm font-black",
                  g === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50",
                )}
              >
                {p >= 1000 ? "1 kg" : `${p} g`}
              </button>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-secondary/50 p-4 text-center">
            <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {g} g × R$ {brl(precoKg)} / kg
            </span>
            <span className="money mt-1 block text-5xl leading-none text-primary">
              R$ {brl(totalPeso)}
            </span>
          </p>
        </>
      ) : (
        <>
          <label className="block text-sm font-bold" htmlFor="valor">
            Valor combinado (R$)
          </label>
          <input
            id="valor"
            ref={campoRef}
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(so(e.target.value).slice(0, 9))}
            onKeyDown={(e) => e.key === "Enter" && confirmar()}
            placeholder="0,00"
            className="money mt-1.5 h-20 w-full rounded-2xl border-2 border-border bg-secondary/30 px-4 text-4xl outline-none focus:border-primary focus:bg-card"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {notas.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setValor(brl(n))}
                className="press h-12 rounded-xl border-2 border-border bg-card text-sm font-black text-muted-foreground hover:border-primary/50"
              >
                R$ {n}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

/**
 * Sabor que não mexe no preço: uma pergunta, botões grandes, um toque.
 * O olho lê o sabor antes do preço — por isso o nome ocupa a linha inteira.
 */
export function ModalOpcao({
  produto,
  url,
  onFechar,
  onEscolher,
}: {
  produto: Produto;
  url?: string;
  onFechar: () => void;
  onEscolher: (opcao: string) => void;
}) {
  const opcoes = produto.opcoes ?? [];
  const multi = produto.opcoesMulti === true;
  const [marcados, setMarcados] = useState<string[]>([]);

  const alternar = (o: string) =>
    setMarcados((m) => (m.includes(o) ? m.filter((x) => x !== o) : [...m, o]));

  return (
    <Modal
      titulo={multi ? "Quais sabores?" : "Qual sabor?"}
      subtitulo={produto.nome}
      onFechar={onFechar}
    >
      <div className="mb-4 flex items-center gap-3">
        <Foto produto={produto} url={url} className="size-14" />
        <p className="text-sm text-muted-foreground">
          {multi
            ? "Pode marcar quantos quiser — o preço continua o mesmo."
            : "Todos custam o mesmo — a escolha só aparece na conta e no recibo."}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map((o) => {
          const escolhido = marcados.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => (multi ? alternar(o) : onEscolher(o))}
              aria-pressed={multi ? escolhido : undefined}
              className={cn(
                "press flex h-16 items-center justify-between gap-3 rounded-xl border-2 px-4 text-left font-display text-xl tracking-wide",
                escolhido
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-secondary/30 hover:border-primary hover:bg-primary-soft",
              )}
            >
              <span className="truncate">{o}</span>
              {multi ? (
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-md border-2",
                    escolhido ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {escolhido ? <Check className="size-4" /> : null}
                </span>
              ) : (
                <Check className="size-5 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Confirmar só existe no modo vários: com um sabor só, o toque já resolve. */}
      {multi ? (
        <button
          type="button"
          disabled={marcados.length === 0}
          onClick={() => onEscolher(marcados.join(" + "))}
          className="press mt-4 h-16 w-full rounded-2xl bg-primary font-display text-2xl tracking-wide text-primary-foreground disabled:opacity-40"
        >
          {marcados.length === 0
            ? "Escolha ao menos um"
            : `Lançar (${marcados.length} ${marcados.length === 1 ? "sabor" : "sabores"})`}
        </button>
      ) : null}
    </Modal>
  );
}

