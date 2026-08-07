import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useConfirmar } from "@/components/confirmar";
import { useConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { norm } from "./comum";

/**
 * Editor do salão — a loja monta o próprio espaço.
 * Nada de "8 mesas" imposto: quem só tem balcão desliga o salão e a grade
 * simplesmente deixa de existir. Menos escolha na tela = menos carga (Hick).
 */
export function EditorSalao() {
  const [config, setConfig] = useConfig();
  const confirmar = useConfirmar();
  const [novo, setNovo] = useState("");

  const termos = ["Mesa", "Box", "Cabine", "Sala"];

  const addDestino = () => {
    const n = novo.trim();
    if (!n) return;
    if (config.destinos.some((d) => norm(d) === norm(n))) {
      toast.info(`"${n}" já está nos atalhos`);
      setNovo("");
      return;
    }
    setConfig({ destinos: [...config.destinos, n].slice(0, 9) });
    setNovo("");
  };

  return (
    <div className="rise-in mb-3 space-y-3 rounded-2xl border border-primary/30 bg-primary-soft/40 p-3">
      <label className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">Minha loja tem mesas</span>
        <button
          role="switch"
          aria-checked={config.salaoAtivo}
          onClick={() =>
            setConfig({
              salaoAtivo: !config.salaoAtivo,
              qtdMesas: !config.salaoAtivo && config.qtdMesas < 1 ? 4 : config.qtdMesas,
            })
          }
          className={cn(
            "press relative h-8 w-14 shrink-0 rounded-full transition-colors",
            config.salaoAtivo ? "bg-primary" : "bg-foreground/20",
          )}
        >
          <span
            className={cn(
              "absolute top-1 size-6 rounded-full bg-card shadow transition-all",
              config.salaoAtivo ? "left-7" : "left-1",
            )}
          />
        </button>
      </label>

      {config.salaoAtivo ? (
        <>
          <div>
            <span className="eyebrow text-muted-foreground">Como você chama</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {termos.map((t) => (
                <button
                  key={t}
                  onClick={() => setConfig({ termoMesa: t })}
                  className={cn(
                    "press h-10 rounded-lg border text-xs font-black uppercase tracking-wide transition-colors",
                    norm(config.termoMesa) === norm(t)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card/70 text-muted-foreground hover:border-primary",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="eyebrow text-muted-foreground">
              Quantos lugares · {config.qtdMesas}
            </span>
            <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <button
                onClick={() => setConfig({ qtdMesas: Math.max(1, config.qtdMesas - 1) })}
                aria-label="Menos um lugar"
                className="press grid size-10 place-items-center rounded-lg border border-border bg-card/70"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="range"
                min={1}
                max={24}
                value={config.qtdMesas}
                onChange={(e) => setConfig({ qtdMesas: Number(e.target.value) })}
                aria-label="Quantidade de lugares no salão"
                className="h-2 w-full accent-primary"
              />
              <button
                onClick={() => setConfig({ qtdMesas: Math.min(24, config.qtdMesas + 1) })}
                aria-label="Mais um lugar"
                className="press grid size-10 place-items-center rounded-lg border border-border bg-card/70"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div>
        <span className="eyebrow text-muted-foreground">Meta do dia · R$ {config.metaDiaria}</span>
        <input
          type="range"
          min={100}
          max={10000}
          step={100}
          value={config.metaDiaria}
          onChange={(e) => setConfig({ metaDiaria: Number(e.target.value) })}
          aria-label="Meta de faturamento do dia"
          className="mt-1.5 h-2 w-full accent-primary"
        />
      </div>

      <div>
        <span className="eyebrow text-muted-foreground">Atalhos de conta</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {config.destinos.map((d) => (
            <button
              key={d}
              onClick={async () => {
                const ok = await confirmar({
                  titulo: `Remover o atalho "${d}"?`,
                  descricao: "Ele deixa de aparecer na tela de vendas.",
                  confirmar: "Remover",
                });
                if (ok) setConfig({ destinos: config.destinos.filter((x) => x !== d) });
              }}

              title={`Remover ${d}`}
              className="press flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold transition-colors hover:border-danger hover:text-danger"
            >
              {d}
              <X className="size-3.5 opacity-60" />
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDestino();
              }
            }}
            placeholder="Ex.: Delivery, Viagem, Sacolão"
            aria-label="Novo atalho de conta"
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium outline-none focus:border-primary"
          />
          <button
            onClick={addDestino}
            className="press grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"
            aria-label="Adicionar atalho"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
