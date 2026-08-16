import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChefHat, CookingPot, GripVertical, Hand, Undo2 } from "lucide-react";
import { Foto } from "@/components/pdv/comum";
import { useImagens } from "@/lib/imagens";
import type { EtapaPreparo, ItemPreparo } from "@/lib/preparo.functions";
import { cn } from "@/lib/utils";

const colunas: { etapa: EtapaPreparo; titulo: string; icone: typeof ChefHat; cor: string }[] = [
  { etapa: "todo", titulo: "A fazer", icone: Hand, cor: "border-warning" },
  { etapa: "doing", titulo: "Montando", icone: CookingPot, cor: "border-primary" },
  { etapa: "done", titulo: "Pronto — entregar", icone: Check, cor: "border-success" },
];

const minutos = (desde: string, agora: number) =>
  Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60000));

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Vibração curta: o dedo confirma antes de o olho conferir. */
function tocar(ms: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(ms);
    } catch {
      /* aparelho sem motor: silêncio é aceitável */
    }
  }
}

type Ritmo = { cronometro: boolean; alertaMin: number; atrasoMin: number };

/**
 * Quadro da bancada. Mesmo componente na tela logada e no link compartilhado:
 * três colunas, número de ordem grande, hora de entrada e arrastar para
 * mudar a fila. Um item = um cartão; nada compete pela atenção.
 */
export function QuadroPreparo({
  itens,
  ritmo,
  aoMarcar,
  aoReordenar,
  falhouEm,
}: {
  itens: ItemPreparo[];
  ritmo: Ritmo;
  aoMarcar: (id: string, etapa: EtapaPreparo) => void;
  aoReordenar: (ids: string[]) => void;
  /** Id do cartão cuja nova ordem o servidor recusou: ele treme em vez de mentir. */
  falhouEm?: string | null;
}) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const [arrastando, setArrastando] = useState<string | null>(null);
  const urlDe = useImagens(itens.map((i) => i.foto));
  const sensores = useSensors(
    /* Um arrasto curto não pode virar toque acidental no botão "Começar". */
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  /* Cartão que apareceu depois que a tela já estava aberta chega anunciado. */
  const vistos = useRef<Set<string> | null>(null);
  const novos = useMemo(() => {
    const atual = new Set(itens.map((i) => i.id));
    if (vistos.current === null) {
      vistos.current = atual;
      return new Set<string>();
    }
    const chegaram = new Set<string>();
    atual.forEach((id) => {
      if (!vistos.current!.has(id)) chegaram.add(id);
    });
    vistos.current = atual;
    return chegaram;
  }, [itens]);

  const porEtapa = useMemo(() => {
    const m = new Map<EtapaPreparo, ItemPreparo[]>();
    colunas.forEach((c) => m.set(c.etapa, []));
    itens.forEach((i) => m.get(i.etapa)?.push(i));
    return m;
  }, [itens]);

  /* A numeração #1, #2… é a ordem real de atendimento da bancada inteira. */
  const numero = new Map<string, number>();
  [
    ...(porEtapa.get("todo") ?? []),
    ...(porEtapa.get("doing") ?? []),
    ...(porEtapa.get("done") ?? []),
  ].forEach((i, k) => numero.set(i.id, k + 1));

  const emFoco = (porEtapa.get("todo") ?? [])[0]?.id ?? null;
  const item = (id: string | null) => itens.find((i) => i.id === id) ?? null;

  function soltar(etapa: EtapaPreparo, e: DragEndEvent) {
    setArrastando(null);
    const lista = porEtapa.get(etapa) ?? [];
    const de = lista.findIndex((i) => i.id === e.active.id);
    const para = lista.findIndex((i) => i.id === e.over?.id);
    if (de < 0 || para < 0 || de === para) return;
    tocar(18);
    aoReordenar(arrayMove(lista, de, para).map((i) => i.id));
  }

  function pegar(e: DragStartEvent) {
    setArrastando(String(e.active.id));
    tocar(12);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {colunas.map((col) => {
        const lista = porEtapa.get(col.etapa) ?? [];
        const voando = item(arrastando);
        return (
          <section
            key={col.etapa}
            className={cn("rounded-2xl border-t-4 bg-card p-4 shadow-sm", col.cor)}
          >
            <h2 className="flex items-center justify-between gap-2 font-display text-2xl tracking-wide">
              <span className="flex min-w-0 items-center gap-2">
                <col.icone className="size-5 shrink-0 text-muted-foreground" />
                <span className="truncate">{col.titulo}</span>
              </span>
              <span className="money shrink-0 text-xl text-muted-foreground">{lista.length}</span>
            </h2>

            <DndContext
              sensors={sensores}
              collisionDetection={closestCenter}
              onDragStart={pegar}
              onDragCancel={() => setArrastando(null)}
              onDragEnd={(e) => soltar(col.etapa, e)}
            >
              <SortableContext
                items={lista.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="mt-3 space-y-3">
                  {lista.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      {col.etapa === "todo"
                        ? "Nada esperando — bancada limpa."
                        : col.etapa === "doing"
                          ? "Ninguém montando agora."
                          : "Nada esperando o cliente."}
                    </li>
                  ) : (
                    lista.map((i) => (
                      <Cartao
                        key={i.id}
                        item={i}
                        etapa={col.etapa}
                        posicao={numero.get(i.id) ?? 0}
                        foto={urlDe(i.foto)}
                        min={minutos(i.criadoEm, agora)}
                        ritmo={ritmo}
                        proximo={i.id === emFoco}
                        recuado={col.etapa === "todo" && emFoco !== null && i.id !== emFoco}
                        novo={novos.has(i.id)}
                        tremer={falhouEm === i.id}
                        aoMarcar={aoMarcar}
                      />
                    ))
                  )}
                </ul>
              </SortableContext>

              {/* O cartão levanta da pilha e viaja na mão. */}
              <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(.2,.9,.25,1)" }}>
                {voando && voando.etapa === col.etapa ? (
                  <ul className="fila-voa list-none">
                    <CartaoBase
                      item={voando}
                      etapa={col.etapa}
                      posicao={numero.get(voando.id) ?? 0}
                      foto={urlDe(voando.foto)}
                      min={minutos(voando.criadoEm, agora)}
                      ritmo={ritmo}
                      proximo={voando.id === emFoco}
                      aoMarcar={() => {}}
                    />
                  </ul>
                ) : null}
              </DragOverlay>
            </DndContext>
          </section>
        );
      })}
    </div>
  );
}

type CartaoProps = {
  item: ItemPreparo;
  etapa: EtapaPreparo;
  posicao: number;
  foto?: string;
  min: number;
  ritmo: Ritmo;
  proximo?: boolean;
  recuado?: boolean;
  novo?: boolean;
  tremer?: boolean;
  aoMarcar: (id: string, etapa: EtapaPreparo) => void;
};

function Cartao(props: CartaoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id,
  });

  return (
    <CartaoBase
      {...props}
      refCartao={setNodeRef}
      estilo={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 180ms cubic-bezier(.2,.9,.25,1)",
        opacity: isDragging ? 0.35 : undefined,
      }}
      pegador={{ ...attributes, ...listeners }}
    />
  );
}

function CartaoBase({
  item,
  etapa,
  posicao,
  foto,
  min,
  ritmo,
  proximo,
  recuado,
  novo,
  tremer,
  aoMarcar,
  refCartao,
  estilo,
  pegador,
}: CartaoProps & {
  refCartao?: (n: HTMLElement | null) => void;
  estilo?: React.CSSProperties;
  pegador?: Record<string, unknown>;
}) {
  const urgente = ritmo.cronometro && min >= ritmo.atrasoMin;
  const atencao = ritmo.cronometro && min >= ritmo.alertaMin;
  const [fecho, setFecho] = useState<"pronto" | "saindo" | null>(null);

  /* Fechamento sensorial: o corpo termina a tarefa antes da tela recarregar. */
  function avancar() {
    const alvo: EtapaPreparo = etapa === "todo" ? "doing" : etapa === "doing" ? "done" : "delivered";
    if (alvo === "done") {
      setFecho("pronto");
      tocar([14, 40, 22]);
      window.setTimeout(() => setFecho(null), 600);
      aoMarcar(item.id, alvo);
      return;
    }
    if (alvo === "delivered") {
      setFecho("saindo");
      tocar(20);
      window.setTimeout(() => aoMarcar(item.id, alvo), 200);
      return;
    }
    tocar(10);
    aoMarcar(item.id, alvo);
  }

  return (
    <li
      ref={refCartao}
      style={estilo}
      className={cn(
        "relative rounded-xl border-2 bg-background p-3 transition-[opacity,filter]",
        novo ? "fila-entra" : "rise-in",
        fecho === "pronto" && "varredura-pronto",
        fecho === "saindo" && "fila-sai",
        tremer && "shake border-danger",
        urgente ? "animate-pulse border-danger" : atencao ? "border-warning" : "border-border",
        proximo && !urgente && !atencao && "border-primary",
        proximo && "shadow-md ring-2 ring-primary/35",
        recuado && "opacity-70",
      )}
    >
      {novo ? (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-primary-foreground">
          + novo
        </span>
      ) : null}

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Arrastar para mudar a ordem"
          className="grid h-12 w-12 shrink-0 touch-none place-items-center rounded-lg text-muted-foreground/70 hover:bg-secondary active:bg-secondary"
          {...pegador}
        >
          <GripVertical className="size-6" />
        </button>

        <span
          className={cn(
            "money grid size-11 shrink-0 place-items-center rounded-xl text-lg tabular-nums",
            proximo ? "bg-primary text-primary-foreground" : "bg-foreground text-background",
          )}
        >
          #{posicao}
        </span>

        <Foto produto={{ nome: item.produto, foto: item.foto }} url={foto} className="size-12" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl leading-tight tracking-wide">
            {item.quantidade > 1 ? `${item.quantidade}× ` : ""}
            {item.produto}
          </p>
          <p className="truncate text-sm font-bold text-muted-foreground">
            {item.conta} · {hora(item.criadoEm)}
          </p>
        </div>

        {ritmo.cronometro ? (
          <span
            className={cn(
              "money shrink-0 rounded-lg px-2 py-1 text-lg tabular-nums",
              urgente
                ? "bg-danger text-danger-foreground"
                : atencao
                  ? "bg-warning-soft text-warning-foreground"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {min}min
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        {etapa !== "todo" ? (
          <button
            type="button"
            onClick={() => aoMarcar(item.id, etapa === "doing" ? "todo" : "doing")}
            aria-label="Voltar uma etapa"
            className="press grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-border text-muted-foreground hover:border-primary"
          >
            <Undo2 className="size-5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={avancar}
          className={cn(
            "press h-12 flex-1 rounded-xl font-display text-xl tracking-wide",
            etapa === "todo"
              ? "bg-primary text-primary-foreground"
              : etapa === "doing"
                ? "bg-success text-success-foreground"
                : "bg-foreground text-background",
          )}
        >
          {etapa === "todo" ? "Começar" : etapa === "doing" ? "Pronto" : "Entregue"}
        </button>
      </div>
    </li>
  );
}
