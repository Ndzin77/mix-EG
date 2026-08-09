import { useState } from "react";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { useConfig } from "@/lib/config";
import { criarTrava, secoes, senhaConfere, type Secao } from "@/lib/travas";
import { cn } from "@/lib/utils";

/**
 * Cadeado por seção. Um toque no ícone abre a conversa: põe senha, troca ou
 * tira. A senha nunca é guardada em texto — fica só o resumo embaralhado.
 */
export function CartaoSeguranca() {
  const [config, setConfig] = useConfig();
  const [alvo, setAlvo] = useState<Secao | null>(null);
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [atual, setAtual] = useState("");
  const [salvando, setSalvando] = useState(false);

  const bloqueios = config.bloqueios ?? {};
  const travaAtual = alvo ? bloqueios[alvo] : undefined;
  const nomeAlvo = secoes.find((s) => s.chave === alvo)?.rotulo ?? "";

  const fechar = () => {
    setAlvo(null);
    setSenha("");
    setRepetir("");
    setAtual("");
  };

  const definir = async () => {
    if (!alvo || salvando) return;
    if (travaAtual && !(await senhaConfere(atual, travaAtual))) {
      return toast.error("A senha atual não confere.");
    }
    if (senha.length < 4) return toast.error("Use pelo menos 4 caracteres.");
    if (senha !== repetir) return toast.error("As duas senhas precisam ser iguais.");
    setSalvando(true);
    const trava = await criarTrava(senha);
    setConfig({ bloqueios: { ...bloqueios, [alvo]: trava } });
    setSalvando(false);
    toast.success(`${nomeAlvo} agora pede senha.`);
    fechar();
  };

  const remover = async () => {
    if (!alvo || !travaAtual) return;
    if (!(await senhaConfere(atual, travaAtual))) {
      return toast.error("A senha atual não confere.");
    }
    const proximo = { ...bloqueios };
    delete proximo[alvo];
    setConfig({ bloqueios: proximo });
    toast.success(`${nomeAlvo} está liberado.`);
    fechar();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <ShieldCheck className="size-4" />
        Segurança das seções
      </span>
      <p className="mt-1 text-xs text-muted-foreground">
        Toque no cadeado para proteger uma tela. A senha é pedida toda vez que ela é aberta —
        mesmo com a conta já logada.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {secoes.map((s) => {
          const travada = Boolean(bloqueios[s.chave]);
          return (
            <button
              key={s.chave}
              type="button"
              onClick={() => setAlvo(s.chave)}
              aria-label={`${travada ? "Trocar ou tirar" : "Pôr"} senha em ${s.rotulo}`}
              className={cn(
                "press flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left text-sm font-bold transition-colors",
                travada
                  ? "border-warning bg-warning-soft text-warning-foreground"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {travada ? (
                <Lock className="size-5 shrink-0" />
              ) : (
                <LockOpen className="size-5 shrink-0" />
              )}
              <span className="min-w-0 truncate">
                {s.rotulo}
                <span className="block text-[10px] font-black uppercase tracking-wide opacity-70">
                  {travada ? "com senha" : "livre"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {alvo ? (
        <Modal
          titulo={`${travaAtual ? "Senha de" : "Proteger"} ${nomeAlvo}`}
          subtitulo={
            travaAtual
              ? "Digite a senha atual para trocar ou tirar o cadeado."
              : "Escolha uma senha só para esta tela."
          }
          onFechar={fechar}
          rodape={
            <>
              {travaAtual ? (
                <button
                  type="button"
                  onClick={() => void remover()}
                  className="press h-12 rounded-xl border-2 border-danger px-4 font-bold text-danger"
                >
                  Tirar cadeado
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void definir()}
                disabled={salvando}
                className="press h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50"
              >
                {travaAtual ? "Trocar senha" : "Ativar cadeado"}
              </button>
            </>
          }
        >
          <div className="grid gap-3">
            {travaAtual ? (
              <label className="text-sm font-bold">
                Senha atual
                <input
                  type="password"
                  autoFocus
                  value={atual}
                  onChange={(e) => setAtual(e.target.value)}
                  className="money mt-1 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-xl outline-none focus:border-primary"
                />
              </label>
            ) : null}
            <label className="text-sm font-bold">
              Nova senha
              <input
                type="password"
                autoFocus={!travaAtual}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mínimo 4 caracteres"
                className="money mt-1 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-xl outline-none focus:border-primary"
              />
            </label>
            <label className="text-sm font-bold">
              Repita a nova senha
              <input
                type="password"
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void definir()}
                className="money mt-1 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-xl outline-none focus:border-primary"
              />
            </label>
            <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              Guarde a senha em lugar seguro: sem ela, a tela não abre e só dá para liberar aqui
              no Admin.
            </p>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
