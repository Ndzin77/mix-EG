import { useState } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { CampoSenha } from "@/components/campo-senha";
import { dataFinal } from "@/components/mestre/editor-loja";
import { cn } from "@/lib/utils";

const ATALHOS = [7, 30, 90, 180, 365];

/** Cria a loja do cliente já confirmada e já paga — sem e-mail de confirmação. */
export function NovoCliente({
  salvando,
  onFechar,
  onCriar,
}: {
  salvando: boolean;
  onFechar: () => void;
  onCriar: (v: { email: string; senha: string; loja: string; nome: string; dias: number }) => void;
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loja, setLoja] = useState("");
  const [nome, setNome] = useState("");
  const [dias, setDias] = useState(30);

  const pronto = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && senha.length >= 6 && loja.trim().length > 1;

  return (
    <Modal
      titulo="Novo cliente"
      subtitulo="A conta já nasce confirmada e liberada"
      onFechar={onFechar}
      rodape={
        <>
          <Button
            onClick={() => onCriar({ email, senha, loja, nome, dias })}
            disabled={!pronto || salvando}
            className="press h-14 flex-1 rounded-xl bg-success text-lg font-bold text-success-foreground hover:bg-success/90"
          >
            {salvando ? "Criando…" : `Criar e liberar ${dias} dias`}
          </Button>
          <Button variant="secondary" onClick={onFechar} className="h-14 rounded-xl px-6">
            Cancelar
          </Button>
        </>
      }
    >
      <label className="block text-sm font-bold">
        E-mail de acesso
        <input
          type="email"
          value={email}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-base outline-none focus:border-primary focus:bg-card"
        />
      </label>

      <CampoSenha
        rotulo="Senha inicial"
        valor={senha}
        onChange={setSenha}
        placeholder="mínimo 6 caracteres"
        className="mt-4"
      />

      <label className="mt-4 block text-sm font-bold">
        Nome da loja
        <input
          value={loja}
          onChange={(e) => setLoja(e.target.value)}
          className="mt-1 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-base outline-none focus:border-primary focus:bg-card"
        />
      </label>

      <label className="mt-4 block text-sm font-bold">
        Nome do dono (opcional)
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-1 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-base outline-none focus:border-primary focus:bg-card"
        />
      </label>

      <div className="mt-5">
        <span className="eyebrow text-muted-foreground">Dias liberados</span>
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
      </div>

      <p className="mt-5 rounded-2xl border-2 border-success/50 bg-success-soft p-4 text-sm">
        Vai criar <strong>{email || "o cliente"}</strong> com acesso liberado até{" "}
        <strong>{dataFinal(dias)}</strong>.
      </p>
    </Modal>
  );
}
