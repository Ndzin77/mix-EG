import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/lib/config";
import { confirmarSenhaLogin } from "@/lib/conta.functions";
import { criarTrava, erroSenha, senhaConfere, senhaValida, type Secao } from "@/lib/travas";
import { cn } from "@/lib/utils";


/**
 * Porta da seção. Se a loja pôs cadeado nesta tela, nada do conteúdo é
 * montado antes da senha certa — e o acesso vale só enquanto a tela fica
 * aberta (sair do menu tranca de novo).
 */
export function TravaSecao({
  secao,
  titulo,
  children,
}: {
  secao: Secao;
  titulo: string;
  children: ReactNode;
}) {
  const [config, setConfig] = useConfig();
  const navigate = useNavigate();
  const trava = config.bloqueios?.[secao];
  const conferirLogin = useServerFn(confirmarSenhaLogin);

  const [liberado, setLiberado] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  /* Esqueceu a senha desta tela? A senha do login é a chave-mestra: sem ela
     ninguém entra, com ela dá para gravar uma senha nova aqui mesmo. */
  const [recuperando, setRecuperando] = useState(false);
  const [senhaLogin, setSenhaLogin] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  const regravar = async () => {
    if (salvandoNova) return;
    const problema = erroSenha(novaSenha);
    if (problema) return toast.error(problema);
    setSalvandoNova(true);
    try {
      await conferirLogin({ data: { senha: senhaLogin } });
      const nova = await criarTrava(novaSenha);
      setConfig({ bloqueios: { ...(config.bloqueios ?? {}), [secao]: nova } });
      toast.success("Senha desta tela trocada.");
      setRecuperando(false);
      setSenhaLogin("");
      setNovaSenha("");
      setLiberado(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A senha do login não confere.");
    } finally {
      setSalvandoNova(false);
    }
  };


  useEffect(() => {
    campo.current?.focus();
  }, [trava]);

  if (!trava || liberado) return <>{children}</>;

  const conferir = async () => {
    if (!senha || conferindo) return;
    setConferindo(true);
    const ok = await senhaConfere(senha, trava);
    setConferindo(false);
    if (ok) {
      setLiberado(true);
      return;
    }
    setErro(true);
    setSenha("");
    campo.current?.focus();
    window.setTimeout(() => setErro(false), 600);
  };

  return (
    <div className="grid min-h-0 flex-1 place-items-center bg-background p-6">
      <div
        className={cn(
          "w-full max-w-sm rounded-3xl border-2 border-border bg-card p-6 text-center shadow-xl",
          erro && "shake border-danger",
        )}
      >
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-warning-soft text-warning-foreground">
          <Lock className="size-8" />
        </span>
        <h1 className="mt-4 font-display text-3xl tracking-wide">{titulo} protegido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta tela pede senha toda vez que é aberta.
        </p>

        <div className="relative mt-5">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={campo}
            type="password"
            autoFocus
            inputMode="numeric"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void conferir()}
            placeholder="Senha da seção"
            aria-label={`Senha da seção ${titulo}`}
            className={cn(
              "money h-16 w-full rounded-2xl border-2 bg-secondary/30 pl-12 pr-4 text-center text-3xl tracking-[0.4em] outline-none transition-colors",
              erro ? "border-danger" : "border-border focus:border-primary",
            )}
          />
        </div>

        {erro ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold text-danger">
            <ShieldAlert className="size-4" />
            Senha incorreta
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void conferir()}
          disabled={!senha || conferindo}
          className="press mt-4 h-14 w-full rounded-2xl bg-primary font-display text-2xl tracking-wider text-primary-foreground disabled:opacity-40"
        >
          {conferindo ? "Conferindo…" : "Abrir"}
        </button>

        {recuperando ? (
          <div className="modal-in mt-4 rounded-2xl border-2 border-border bg-secondary/30 p-4 text-left">
            <p className="text-sm font-bold">Trocar a senha desta tela</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirme a senha do seu login e escolha uma senha nova só para {titulo}.
            </p>
            <input
              type="password"
              value={senhaLogin}
              onChange={(e) => setSenhaLogin(e.target.value)}
              placeholder="Senha do login"
              aria-label="Senha do login"
              className="mt-3 h-13 w-full rounded-xl border-2 border-border bg-card px-4 text-base outline-none focus:border-primary"
            />
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void regravar()}
              placeholder={`Senha nova de ${titulo}`}
              aria-label={`Senha nova de ${titulo}`}
              className="mt-2 h-13 w-full rounded-xl border-2 border-border bg-card px-4 text-base outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void regravar()}
              disabled={!senhaLogin || !senhaValida(novaSenha) || salvandoNova}
              className="press mt-3 h-13 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-40"
            >
              {salvandoNova ? "Conferindo…" : "Gravar senha nova e abrir"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRecuperando(true)}
            className="press mt-3 h-11 w-full rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            Esqueci a senha desta tela
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate({ to: "/vendas" })}
          className="press mt-2 h-12 w-full rounded-xl border-2 border-border font-bold text-muted-foreground hover:border-primary"
        >
          Voltar para Vendas
        </button>

      </div>
    </div>
  );
}
