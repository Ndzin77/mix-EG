import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  /* Tela de login é puro navegador (sessão vive no aparelho): sem SSR não há
     diferença entre o que o servidor manda e o que o React monta. */
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Gestor Pro" },
      {
        name: "description",
        content:
          "Acesso ao Gestor Pro: vendas rápidas no balcão, caixa certo no fim do dia, saídas e relatórios.",
      },
      { property: "og:title", content: "Entrar — Gestor Pro" },
      {
        property: "og:description",
        content: "Login do Gestor Pro, o sistema de gestão para negócios de balcão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  /* Erro de confirmação vira caminho, não parede. */
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [esperaReenvio, setEsperaReenvio] = useState(0);
  /* Só libera o botão quando o React já está no comando do formulário. */
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setPronto(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/vendas", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (esperaReenvio <= 0) return;
    const timer = window.setInterval(() => setEsperaReenvio((segundos) => Math.max(0, segundos - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [esperaReenvio]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    setNaoConfirmado(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) {
        if (/confirm/i.test(error.message)) {
          setNaoConfirmado(true);
          throw new Error("Seu e-mail ainda não foi confirmado.");
        }
        throw new Error(/invalid login/i.test(error.message) ? "E-mail ou senha incorretos." : traduzirErroAuth(error.message));
      }
      navigate({ to: "/vendas", replace: true });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }

  async function reenviar() {
    if (reenviando || esperaReenvio > 0) return;
    setReenviando(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) throw new Error(traduzirErroAuth(error.message));
      setEsperaReenvio(60);
      toast.success("Link enviado. Confira a caixa de entrada e o spam.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não consegui reenviar agora.");
    } finally {
      setReenviando(false);
    }
  }



  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary font-display text-2xl tracking-wide text-primary-foreground shadow-lg">
            GP
          </div>
          <h1 className="mt-4 font-display text-3xl leading-none tracking-wide">Gestor Pro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão para negócios de balcão
          </p>
        </div>

        <form
          onSubmit={enviar}
          className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-2xl tracking-wide">Entrar no sistema</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso restrito às lojas assinantes. Fale com o suporte para liberar um novo usuário.
          </p>

          <label className="mt-5 block text-sm font-bold">
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1.5 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-base font-normal outline-none transition-colors focus:border-primary focus:bg-card"
            />
          </label>

          <label className="mt-4 block text-sm font-bold">
            Senha
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1.5 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-base font-normal outline-none transition-colors focus:border-primary focus:bg-card"
            />
          </label>

          <Button
            type="submit"
            disabled={carregando || !pronto}
            className="touch-target mt-6 h-14 w-full rounded-xl text-lg font-bold shadow-lg"
          >
            {!pronto ? "Carregando..." : carregando ? "Aguarde..." : "Entrar"}
          </Button>

          {naoConfirmado ? (
            <div className="modal-in mt-5 rounded-2xl border-2 border-warning/50 bg-warning/10 p-4 text-left">
              <p className="text-sm font-bold">Seu e-mail ainda não foi confirmado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O pagamento não se perde: assim que você confirmar, o acesso libera com o plano já
                aplicado.
              </p>
              <Button
                type="button"
                onClick={() => void reenviar()}
                disabled={reenviando || esperaReenvio > 0}
                className="press mt-3 h-12 w-full rounded-xl bg-warning font-bold text-warning-foreground hover:bg-warning/90"
              >
                {reenviando
                  ? "Enviando…"
                  : esperaReenvio > 0
                    ? `Tente novamente em ${esperaReenvio}s`
                    : `Reenviar confirmação para ${email.trim()}`}
              </Button>
            </div>
          ) : null}

        </form>
      </div>
    </div>
  );
}

function traduzirErroAuth(mensagem: string) {
  if (/rate limit|too many requests/i.test(mensagem)) {
    return "Muitos e-mails foram solicitados em pouco tempo. Aguarde alguns minutos antes de tentar novamente.";
  }
  return mensagem;
}
