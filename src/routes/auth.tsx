import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  /* Tela de login é puro navegador (sessão vive no aparelho): sem SSR não há
     diferença entre o que o servidor manda e o que o React monta. */
  ssr: false,
  head: () => ({
    meta: [

      { title: "Entrar — Doce PDV" },
      {
        name: "description",
        content:
          "Acesso ao Doce PDV, o sistema de gestão para sorveterias e confeitarias: vendas, comandas, saídas e relatórios.",
      },
      { property: "og:title", content: "Entrar — Doce PDV" },
      {
        property: "og:description",
        content: "Login do Doce PDV, sistema de gestão para sorveterias e confeitarias.",
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
  /* Só libera o botão quando o React já está no comando do formulário. */
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setPronto(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/vendas", replace: true });
    });
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) {
        throw new Error(
          /invalid login/i.test(error.message)
            ? "E-mail ou senha incorretos."
            : /confirm/i.test(error.message)
              ? "E-mail ainda não confirmado."
              : error.message,
        );
      }
      navigate({ to: "/vendas", replace: true });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary font-display text-2xl tracking-wide text-primary-foreground shadow-lg">
            DP
          </div>
          <h1 className="mt-4 font-display text-3xl leading-none tracking-wide">Doce PDV</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão para sorveterias e confeitarias
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
              className="mt-1.5 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-base font-normal outline-none transition-colors focus:border-primary focus:bg-card"
            />
          </label>

          <button
            type="submit"
            disabled={carregando || !pronto}
            className="touch-target mt-6 w-full rounded-xl bg-primary px-4 text-lg font-bold text-primary-foreground shadow-lg transition-opacity disabled:opacity-60"
          >
            {!pronto ? "Carregando..." : carregando ? "Aguarde..." : "Entrar"}
          </button>

        </form>
      </div>
    </div>
  );
}
