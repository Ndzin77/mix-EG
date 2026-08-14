import { useState } from "react";
import { CalendarClock, KeyRound, Lock, NotebookPen, Stethoscope, Unlock } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import type { LojaMestre } from "@/lib/mestre.server";
import { cn } from "@/lib/utils";

const ATALHOS = [7, 30, 90, 180, 365];

export function dataFinal(dias: number) {
  return new Date(Date.now() + dias * 86_400_000).toLocaleDateString("pt-BR");
}

/**
 * Cartão do cliente. A chave grande pinta o cartão inteiro: verde = liberado,
 * vermelho = bloqueado. A pessoa lê a cor antes de ler a palavra. Cada bloco
 * (assinatura, acesso, anotação) fica separado para não haver clique errado
 * por proximidade.
 */
export function EditorLoja({
  loja,
  salvando,
  salvandoNota,
  onFechar,
  onSalvar,
  onAcesso,
  onRaioX,
  onAnotar,
}: {
  loja: LojaMestre;
  salvando: boolean;
  salvandoNota: boolean;
  onFechar: () => void;
  onSalvar: (v: { liberado: boolean; dias: number; preco: number }) => void;
  onAcesso: () => void;
  onRaioX: () => void;
  onAnotar: (nota: string) => void;
}) {
  const [liberado, setLiberado] = useState(loja.ultimoEvento !== "SUBSCRIPTION_CANCELED" && loja.status === "active");
  const [dias, setDias] = useState(30);
  const [preco, setPreco] = useState(loja.preco);
  const [nota, setNota] = useState(loja.anotacao ?? "");

  return (
    <Modal
      titulo={loja.loja}
      subtitulo={loja.email ?? "sem e-mail no perfil"}
      onFechar={onFechar}
      rodape={
        <>
          <Button
            onClick={() => onSalvar({ liberado, dias, preco })}
            disabled={salvando}
            className={cn(
              "press h-14 flex-1 rounded-xl text-lg font-bold",
              liberado
                ? "bg-success text-success-foreground hover:bg-success/90"
                : "bg-danger text-danger-foreground hover:bg-danger/90",
            )}
          >
            {salvando ? "Salvando…" : liberado ? `Liberar por ${dias} dias` : "Bloquear agora"}
          </Button>
          <Button variant="secondary" onClick={onFechar} className="h-14 rounded-xl px-6">
            Cancelar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={onRaioX}
          className="press h-14 rounded-xl text-sm font-bold"
        >
          <Stethoscope className="mr-1 size-5" /> Raio-X da loja
        </Button>
        <Button
          variant="secondary"
          onClick={onAcesso}
          className="press h-14 rounded-xl text-sm font-bold"
        >
          <KeyRound className="mr-1 size-5" /> Acesso e senha
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setLiberado((v) => !v)}
        className={cn(
          "press mt-4 flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-colors",
          liberado ? "border-success bg-success-soft" : "border-danger bg-danger/10",
        )}
      >
        <span
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-2xl",
            liberado ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground",
          )}
        >
          {liberado ? <Unlock className="size-7" /> : <Lock className="size-7" />}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-3xl leading-none tracking-wide">
            {liberado ? "Liberado" : "Bloqueado"}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Toque para trocar. A cor do cartão muda junto.
          </span>
        </span>
      </button>

      <div className={cn("mt-5", !liberado && "pointer-events-none opacity-40")}>
        <span className="eyebrow text-muted-foreground">Dias de acesso a partir de hoje</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {ATALHOS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDias(n)}
              className={cn(
                "press h-12 min-w-16 rounded-xl border-2 px-4 font-display text-xl tracking-wide",
                dias === n ? "border-primary bg-primary/10" : "border-border bg-secondary/40",
              )}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={3650}
            value={dias}
            onChange={(e) => setDias(Math.max(1, Number(e.target.value) || 1))}
            className="h-12 w-28 rounded-xl border-2 border-border bg-secondary/30 px-3 text-lg tabular-nums outline-none focus:border-primary"
          />
        </div>

        <label className="mt-4 block text-sm font-bold">
          Preço do plano (R$)
          <input
            type="number"
            step="0.01"
            min={0}
            value={preco}
            onChange={(e) => setPreco(Number(e.target.value) || 0)}
            className="mt-1 h-12 w-40 rounded-xl border-2 border-border bg-secondary/30 px-3 text-lg tabular-nums outline-none focus:border-primary"
          />
        </label>
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-2xl border-2 border-border bg-secondary/40 p-4 text-sm">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        {liberado ? (
          <span>
            Vai liberar <strong>{loja.email ?? loja.loja}</strong> por <strong>{dias} dias</strong> —
            até <strong>{dataFinal(dias)}</strong>.
          </span>
        ) : (
          <span>
            Vai <strong>bloquear</strong> {loja.email ?? loja.loja} agora. O acesso fecha na próxima
            abertura do sistema.
          </span>
        )}
      </p>

      <div className="mt-5">
        <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
          <NotebookPen className="size-4" /> Anotação interna (só você vê)
        </span>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          placeholder="Ex.: pediu prazo até dia 10; cliente da indicação da Vivi."
          className="mt-2 w-full rounded-xl border-2 border-border bg-secondary/30 p-3 text-sm outline-none focus:border-primary focus:bg-card"
        />
        <Button
          variant="secondary"
          disabled={salvandoNota || nota === (loja.anotacao ?? "")}
          onClick={() => onAnotar(nota)}
          className="press mt-2 h-12 rounded-xl px-4 text-sm font-bold"
        >
          {salvandoNota ? "Guardando…" : "Guardar anotação"}
        </Button>
      </div>
    </Modal>
  );
}
