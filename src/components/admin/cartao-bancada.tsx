import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, KeyRound, Link2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { CampoSenha } from "@/components/campo-senha";
import { configurarBancada, statusBancada } from "@/lib/preparo.functions";
import { confirmarSenhaLogin } from "@/lib/conta.functions";
import { senhaValida } from "@/lib/travas";

/**
 * Compartilhar a bancada. Um link e uma senha: o aparelho da cozinha
 * acompanha os pedidos sem ter login no sistema.
 */
export function CartaoBancada() {
  const qc = useQueryClient();
  const ler = useServerFn(statusBancada);
  const gravar = useServerFn(configurarBancada);
  const confirmarLogin = useServerFn(confirmarSenhaLogin);
  const [senha, setSenha] = useState("");
  const [copiado, setCopiado] = useState(false);

  const status = useQuery({ queryKey: ["bancada-status"], queryFn: () => ler() });

  const salvar = useMutation({
    mutationFn: (v: { senha?: string; novoLink?: boolean }) => gravar({ data: v }),
    onSuccess: () => {
      setSenha("");
      toast.success("Bancada atualizada.");
      void qc.invalidateQueries({ queryKey: ["bancada-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const token = status.data?.token ?? null;
  const temSenha = Boolean(status.data?.temSenha);
  const link =
    token && typeof window !== "undefined" ? `${window.location.origin}/bancada/${token}` : "";

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1600);
  }

  /** Esqueceu a senha da bancada? A senha do login confirma e já troca. */
  async function pelaSenhaDoLogin() {
    const digitada = window.prompt("Digite a senha que você usa para entrar no sistema:");
    if (!digitada) return;
    try {
      await confirmarLogin({ data: { senha: digitada } });
      const nova = window.prompt("Confirmado! Digite a nova senha da bancada (mínimo 4):");
      if (!nova) return;
      if (!senhaValida(nova.trim())) return toast.error("Use pelo menos 4 caracteres.");
      salvar.mutate({ senha: nova.trim() });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A senha do login não confere.");
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
          <Link2 className="size-4" />
          Compartilhar a bancada
        </span>
        {status.isLoading ? null : temSenha ? (
          <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-success">
            <ShieldCheck className="size-3.5" />
            Senha definida
          </span>
        ) : (
          <span className="flex animate-pulse items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-danger">
            <ShieldAlert className="size-3.5" />
            Sem senha — o link não abre
          </span>
        )}
      </div>

      {token ? (
        <div className="mt-2 grid gap-2">
          <p className="break-all rounded-lg bg-background px-3 py-2 text-xs font-bold">{link}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void copiar()}
              className="press flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground"
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiado!" : "Copiar link"}
            </button>
            <button
              type="button"
              onClick={() => salvar.mutate({ novoLink: true })}
              className="press flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-border font-bold hover:border-danger"
            >
              <RefreshCw className="size-4" />
              Novo link
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => salvar.mutate({ novoLink: true })}
          className="press mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground"
        >
          <Link2 className="size-4" />
          Gerar link da bancada
        </button>
      )}

      <div className="mt-3">
        <CampoSenha
          rotulo={temSenha ? "Trocar a senha da bancada" : "Definir a senha (obrigatória)"}
          valor={senha}
          onChange={setSenha}
          onEnter={() => senhaValida(senha) && salvar.mutate({ senha: senha.trim() })}
        />
        <button
          type="button"
          disabled={!senhaValida(senha) || salvar.isPending}
          onClick={() => salvar.mutate({ senha: senha.trim() })}
          className="press mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground font-bold text-background disabled:opacity-40"
        >
          <KeyRound className="size-4" />
          Salvar senha
        </button>
        <button
          type="button"
          onClick={() => void pelaSenhaDoLogin()}
          className="press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-border text-sm font-bold hover:border-primary"
        >
          Esqueci a senha da bancada — usar a senha do login
        </button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {temSenha
          ? "Quem abrir o link precisa digitar a senha uma vez por aparelho."
          : "Sem senha definida, o link não abre — defina uma agora."}
      </p>
    </div>
  );
}
