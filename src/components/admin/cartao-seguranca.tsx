import { useState } from "react";
import { KeyRound, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { CampoSenha } from "@/components/campo-senha";
import { useConfig } from "@/lib/config";
import { confirmarSenhaLogin } from "@/lib/conta.functions";
import { criarTrava, secoes, senhaConfere, senhaValida, type Secao } from "@/lib/travas";
import { cn } from "@/lib/utils";

/**
 * Cadeado por seção. Um toque no ícone abre a conversa: põe senha, troca ou
 * tira. A senha nunca é guardada em texto — fica só o resumo embaralhado.
 * Esqueceu? A senha do login vale como chave-mestra.
 */
export function CartaoSeguranca() {
  const [config, setConfig] = useConfig();
  const confirmarLogin = useServerFn(confirmarSenhaLogin);
  const [alvo, setAlvo] = useState<Secao | null>(null);
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [atual, setAtual] = useState("");
  const [mestra, setMestra] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const bloqueios = config.bloqueios ?? {};
  const travaAtual = alvo ? bloqueios[alvo] : undefined;
  const nomeAlvo = secoes.find((s) => s.chave === alvo)?.rotulo ?? "";
  /* Depois de provar quem é pelo login, a senha antiga deixa de ser exigida. */
  const liberado = !travaAtual || mestra === "ok";

  const fechar = () => {
    setAlvo(null);
    setSenha("");
    setRepetir("");
    setAtual("");
    setMestra(null);
  };

  const conferirAtual = async () => {
    if (liberado) return true;
    if (!travaAtual) return true;
    if (await senhaConfere(atual, travaAtual)) return true;
    toast.error("A senha atual não confere.");
    return false;
  };

  const definir = async () => {
    if (!alvo || salvando) return;
    if (!senhaValida(senha)) return toast.error("Use pelo menos 4 caracteres.");
    if (senha !== repetir) return toast.error("As duas senhas precisam ser iguais.");
    if (!(await conferirAtual())) return;
    setSalvando(true);
    const trava = await criarTrava(senha);
    setConfig({ bloqueios: { ...bloqueios, [alvo]: trava } });
    setSalvando(false);
    toast.success(`${nomeAlvo} agora pede senha.`);
    fechar();
  };

  const remover = async () => {
    if (!alvo || !travaAtual) return;
    if (!(await conferirAtual())) return;
    const proximo = { ...bloqueios };
    delete proximo[alvo];
    setConfig({ bloqueios: proximo });
    toast.success(`${nomeAlvo} está liberado.`);
    fechar();
  };

  const usarSenhaDoLogin = async () => {
    const digitada = window.prompt("Digite a senha que você usa para entrar no sistema:");
    if (!digitada) return;
    try {
      await confirmarLogin({ data: { senha: digitada } });
      setMestra("ok");
      toast.success("Confirmado! Agora escolha a senha nova.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A senha do login não confere.");
    }
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
            liberado
              ? "Escolha a senha desta tela."
              : "Digite a senha atual para trocar ou tirar o cadeado."
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
                disabled={salvando || !senhaValida(senha) || senha !== repetir}
                className="press h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-40"
              >
                {travaAtual ? "Trocar senha" : "Ativar cadeado"}
              </button>
            </>
          }
        >
          <div className="grid gap-3">
            {travaAtual && !liberado ? (
              <>
                <CampoSenha
                  rotulo="Senha atual"
                  medidor={false}
                  autoFocus
                  placeholder="a senha desta tela"
                  valor={atual}
                  onChange={setAtual}
                />
                <button
                  type="button"
                  onClick={() => void usarSenhaDoLogin()}
                  className="press flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-border text-sm font-bold hover:border-primary"
                >
                  <KeyRound className="size-4" />
                  Esqueci esta senha — usar a senha do login
                </button>
              </>
            ) : null}
            {liberado && travaAtual ? (
              <p className="rounded-xl bg-success-soft px-3 py-2 text-xs font-bold text-success">
                Identidade confirmada pelo login. Pode definir a senha nova.
              </p>
            ) : null}

            <CampoSenha
              rotulo="Nova senha"
              autoFocus={!travaAtual}
              valor={senha}
              onChange={setSenha}
            />
            <CampoSenha
              rotulo="Repita a nova senha"
              medidor={false}
              placeholder="igual à de cima"
              valor={repetir}
              onChange={setRepetir}
              onEnter={() => void definir()}
            />
            {repetir.length > 0 && repetir !== senha ? (
              <p className="text-xs font-bold text-danger">As duas senhas não batem.</p>
            ) : null}

            <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              Esqueceu a senha desta tela? A senha do login abre tudo aqui no Admin.
            </p>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
