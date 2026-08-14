import { useState } from "react";
import { Check, Copy, KeyRound, Mail, Sparkles } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { CampoSenha } from "@/components/campo-senha";
import type { LojaMestre } from "@/lib/mestre.server";
import { cn } from "@/lib/utils";

/** Senha fácil de ditar no WhatsApp e ainda assim difícil de adivinhar. */
function gerarSenha() {
  const letras = "abcdefghijkmnpqrstuvwxyz";
  const numeros = "23456789";
  const sorteia = (s: string, n: number) =>
    Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
  return `${sorteia(letras, 4)}${sorteia(numeros, 3)}${sorteia(letras, 3)}`;
}

/**
 * Acesso do cliente sem entrar na conta dele: ou você define a senha na hora,
 * ou manda o link oficial. Ação irreversível pede segundo clique — o atrito
 * aqui é proposital.
 */
export function AcessoLoja({
  loja,
  salvando,
  enviando,
  onFechar,
  onDefinir,
  onEnviarLink,
}: {
  loja: LojaMestre;
  salvando: boolean;
  enviando: boolean;
  onFechar: () => void;
  onDefinir: (senha: string) => void;
  onEnviarLink: () => void;
}) {
  const [senha, setSenha] = useState("");
  const [armado, setArmado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const pronto = senha.length >= 6;

  return (
    <Modal
      titulo="Acesso do cliente"
      subtitulo={loja.email ?? "sem e-mail no perfil"}
      onFechar={onFechar}
      rodape={
        <Button variant="secondary" onClick={onFechar} className="h-14 w-full rounded-xl">
          Fechar
        </Button>
      }
    >
      <section className="rounded-2xl border-2 border-border bg-secondary/30 p-4">
        <p className="flex items-center gap-2 font-display text-xl tracking-wide">
          <KeyRound className="size-5 text-muted-foreground" /> Definir senha agora
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Troca na hora. O cliente entra com a senha que você mandar.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <CampoSenha
            rotulo="Nova senha"
            valor={senha}
            onChange={(v) => {
              setSenha(v);
              setArmado(false);
              setCopiado(false);
            }}
            placeholder="mínimo 6 caracteres"
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setSenha(gerarSenha());
              setArmado(false);
              setCopiado(false);
            }}
            className="press mb-6 h-14 shrink-0 rounded-xl px-4 text-sm font-bold"
          >
            <Sparkles className="mr-1 size-4" /> Gerar
          </Button>
        </div>

        {pronto ? (
          <div className="results-pop mt-1 flex items-center gap-2 rounded-xl border-2 border-primary/40 bg-card p-3">
            <code className="min-w-0 flex-1 truncate font-display text-2xl tracking-wide">
              {senha}
            </code>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(senha);
                setCopiado(true);
                window.setTimeout(() => setCopiado(false), 1600);
              }}
              className={cn(
                "press h-11 shrink-0 rounded-lg px-3 text-xs font-bold",
                copiado && "bg-success text-success-foreground hover:bg-success",
              )}
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
        ) : null}

        <Button
          disabled={!pronto || salvando}
          onClick={() => (armado ? onDefinir(senha) : setArmado(true))}
          className={cn(
            "press mt-3 h-14 w-full rounded-xl text-lg font-bold",
            armado
              ? "bg-danger text-danger-foreground hover:bg-danger/90"
              : "bg-primary text-primary-foreground",
          )}
        >
          {salvando
            ? "Trocando…"
            : armado
              ? "Tenho certeza — trocar a senha"
              : "Trocar senha do cliente"}
        </Button>
        {armado ? (
          <p className="results-pop mt-2 text-center text-xs font-bold text-danger">
            Isso derruba a senha atual do cliente. Toque de novo para confirmar.
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl border-2 border-border bg-secondary/30 p-4">
        <p className="flex items-center gap-2 font-display text-xl tracking-wide">
          <Mail className="size-5 text-muted-foreground" /> Enviar link por e-mail
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          O cliente escolhe a própria senha. Você não vê nada — melhor quando ele tem acesso ao
          e-mail.
        </p>
        <Button
          variant="secondary"
          disabled={enviando || !loja.email}
          onClick={onEnviarLink}
          className="press mt-3 h-14 w-full rounded-xl text-base font-bold"
        >
          {enviando ? "Enviando…" : `Enviar para ${loja.email ?? "—"}`}
        </Button>
      </section>
    </Modal>
  );
}
