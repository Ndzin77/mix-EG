import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";
import { brl, rotulosMesa, useConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { nomesClientes } from "@/lib/vendas.functions";

import { norm } from "./comum";

/** Pop-up de destino da conta: um toque (ou uma tecla) resolve o nome. */
export function ModalCliente({
  total,
  nome,
  setNome,
  pendente,
  onFechar,
  onConfirmar,
}: {
  total: number;
  nome: string;
  setNome: (v: string) => void;
  pendente: boolean;
  onFechar: () => void;
  onConfirmar: (nome: string) => void;
}) {
  const [config] = useConfig();
  const atalhos = useMemo(() => [...rotulosMesa(config), ...config.destinos], [config]);
  const campoRef = useRef<HTMLInputElement>(null);

  /* Nomes que a loja já usou: quem volta sempre é reconhecido ao digitar. */
  const buscarNomes = useServerFn(nomesClientes);
  const nomesQuery = useQuery({
    queryKey: ["nomes-clientes"],
    queryFn: () => buscarNomes(),
    staleTime: 5 * 60_000,
  });

  const sugestoes = useMemo(() => {
    const q = norm(nome.trim());
    if (!q) return [];
    return (nomesQuery.data ?? []).filter((n) => norm(n).includes(q) && norm(n) !== q).slice(0, 5);
  }, [nome, nomesQuery.data]);

  const [ativo, setAtivo] = useState(0);
  useEffect(() => setAtivo(0), [nome]);

  /* Teclado: 1–9 pegam os atalhos na ordem em que aparecem na tela. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
        return;
      }
      const alvo = e.target as HTMLElement | null;
      const digitando =
        !!alvo &&
        (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable);
      if (digitando || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
      if (n >= 0 && n < atalhos.length) {
        e.preventDefault();
        onConfirmar(atalhos[n]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [atalhos, onConfirmar, onFechar]);

  const escolher = (valor: string) => onConfirmar(valor);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="De quem é essa conta"
      className="overlay-in fixed inset-0 z-50 grid place-items-center bg-foreground/45 p-4"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border-2 border-warning/40 bg-card shadow-2xl"
      >
        <div className="h-1.5 bg-warning" />
        <div className="p-6">
          <p className="eyebrow text-muted-foreground">Anotar R$ {brl(total)}</p>
          <h2 className="font-display text-3xl leading-tight tracking-wide">
            De quem é essa conta?
          </h2>

          {atalhos.length > 0 ? (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {atalhos.map((s, i) => (
                <button
                  key={s}
                  onClick={() => escolher(s)}
                  className="press relative h-14 rounded-xl border-2 border-border bg-secondary/40 text-sm font-black uppercase tracking-wide transition-colors hover:border-warning hover:bg-warning-soft"
                >
                  {s}
                  {i < 9 ? <span className="kbd absolute right-1.5 top-1.5">{i + 1}</span> : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              ref={campoRef}
              value={nome}
              autoFocus
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && sugestoes.length) {
                  e.preventDefault();
                  setAtivo((a) => (a + 1) % sugestoes.length);
                } else if (e.key === "ArrowUp" && sugestoes.length) {
                  e.preventDefault();
                  setAtivo((a) => (a - 1 + sugestoes.length) % sugestoes.length);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  escolher(sugestoes[ativo] ?? nome);
                }
              }}
              placeholder="Ou digite o nome (ex.: Ana do flocos)"
              aria-label="Nome do cliente"
              className="h-14 rounded-xl border-2 border-border bg-secondary/30 px-4 text-lg font-bold outline-none focus:border-warning focus:bg-card"
            />
            <button
              onClick={() => escolher(sugestoes[ativo] ?? nome)}
              disabled={pendente}
              className="press glow-warning h-14 rounded-xl bg-warning px-6 font-display text-2xl tracking-wide text-warning-foreground disabled:opacity-50"
            >
              {pendente ? <Loader2 className="size-6 animate-spin" /> : "Anotar"}
            </button>
          </div>

          {/* Clientes já atendidos: digita duas letras e o nome certo aparece. */}
          {sugestoes.length ? (
            <div className="rise-in mt-2 overflow-hidden rounded-xl border border-border bg-card">
              {sugestoes.map((s, i) => (
                <button
                  key={s}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => escolher(s)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 transition-colors",
                    i === ativo ? "bg-warning-soft" : "hover:bg-secondary/40",
                  )}
                >
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-bold">{s}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
