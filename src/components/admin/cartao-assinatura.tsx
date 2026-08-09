import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  Lock,
  ShieldAlert,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { linkCheckout, minhaAssinatura } from "@/lib/assinatura.functions";
import { useConfig } from "@/lib/config";
import { senhaConfere } from "@/lib/travas";
import { cn } from "@/lib/utils";

/** URL fixa da loja: não muda se o projeto for renomeado. */
const WEBHOOK_URL =
  "https://project--115d4147-813f-4dcc-9100-b35d7ab5c857.lovable.app/api/public/kirvano";

/**
 * Assinatura no painel da dona. Duas perguntas em um cartão: "estou em dia?"
 * e "onde ligo a Kirvano?". Pode ficar atrás de senha, igual às outras seções.
 */
export function CartaoAssinatura() {
  const [config] = useConfig();
  const trava = config.bloqueios?.["assinatura"];
  const [aberto, setAberto] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <BadgeCheck className="size-4" />
        Assinatura e cobrança
      </span>

      {trava && !aberto ? (
        <PortaSenha trava={trava} onOk={() => setAberto(true)} />
      ) : (
        <Conteudo />
      )}
    </section>
  );
}

function PortaSenha({
  trava,
  onOk,
}: {
  trava: { hash: string; salt: string };
  onOk: () => void;
}) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  const conferir = async () => {
    if (await senhaConfere(senha, trava)) return onOk();
    setErro(true);
    setSenha("");
    window.setTimeout(() => setErro(false), 600);
  };

  return (
    <div className={cn("mt-3 rounded-2xl border-2 border-border p-4", erro && "shake border-danger")}>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Lock className="size-4 text-warning" />
        Esta parte pede senha
      </p>
      <div className="relative mt-3">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void conferir()}
          placeholder="Senha da assinatura"
          aria-label="Senha da seção Assinatura"
          className="money h-14 w-full rounded-xl border-2 border-border bg-secondary/30 pl-11 pr-3 text-center text-2xl tracking-[0.3em] outline-none focus:border-primary"
        />
      </div>
      {erro ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-danger">
          <ShieldAlert className="size-4" />
          Senha incorreta
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void conferir()}
        disabled={!senha}
        className="press mt-3 h-12 w-full rounded-xl bg-primary font-display text-xl tracking-wider text-primary-foreground disabled:opacity-40"
      >
        Abrir
      </button>
    </div>
  );
}

function Conteudo() {
  const ler = useServerFn(minhaAssinatura);
  const lerLink = useServerFn(linkCheckout);

  const assinatura = useQuery({ queryKey: ["assinatura"], queryFn: () => ler(), retry: false });
  const checkout = useQuery({
    queryKey: ["checkout-url"],
    queryFn: () => lerLink(),
    staleTime: Infinity,
    retry: false,
  });

  const a = assinatura.data;
  const emDia = a?.emDia ?? false;
  const data = a ? new Date(a.venceEm).toLocaleDateString("pt-BR") : "—";

  const copiar = async (texto: string, nome: string) => {
    await navigator.clipboard.writeText(texto);
    toast.success(`${nome} copiado.`);
  };

  return (
    <>
      {/* Semáforo: cor antes do texto — a leitura é instantânea. */}
      <div
        className={cn(
          "mt-3 rounded-2xl border-2 p-4",
          emDia ? "border-success/50 bg-success-soft" : "border-danger/50 bg-danger/10",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-display text-2xl tracking-wide">
            {emDia ? (
              <CheckCircle2 className="size-6 text-success" />
            ) : (
              <ShieldAlert className="size-6 animate-pulse text-danger" />
            )}
            {assinatura.isLoading
              ? "Conferindo…"
              : emDia
                ? "Assinatura em dia"
                : a?.bloqueado
                  ? "Acesso bloqueado"
                  : `Atrasada há ${a?.atraso ?? 0} dia(s)`}
          </span>
          <span className="money text-lg font-black">
            R$ {(a?.valor ?? 39.9).toFixed(2).replace(".", ",")}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-4" />
          {emDia ? "Próxima cobrança em" : "Vencimento em"} {data} · plano {a?.plano ?? "mensal"}
        </p>

        {!emDia && a ? (
          <div className="mt-3 flex gap-1" aria-hidden>
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  i < a.atraso ? "bg-danger" : "bg-border",
                )}
              />
            ))}
          </div>
        ) : null}

        {!emDia ? (
          <a
            href={checkout.data?.url || "#"}
            target={checkout.data?.url ? "_blank" : undefined}
            rel="noreferrer"
            className="press mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-xl tracking-wider text-primary-foreground"
          >
            <CreditCard className="size-5" />
            Regularizar agora
          </a>
        ) : null}
      </div>

      {/* Ligação com a Kirvano */}
      <div className="mt-4 rounded-2xl border border-border p-4">
        <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
          <Webhook className="size-4" />
          Webhook da Kirvano
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          Na Kirvano, crie o webhook com esta URL e marque todos os eventos. O token de segurança
          já está guardado aqui no sistema.
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-border bg-secondary/30 p-2">
          <code className="min-w-0 flex-1 truncate text-xs">{WEBHOOK_URL}</code>
          <button
            type="button"
            onClick={() => void copiar(WEBHOOK_URL, "Link do webhook")}
            className="press grid size-10 shrink-0 place-items-center rounded-lg bg-foreground text-background"
            aria-label="Copiar o link do webhook"
          >
            <Copy className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Token de segurança: guardado como <b>KIRVANO_WEBHOOK_TOKEN</b> — a Kirvano envia no
          cabeçalho <code>security-token</code>.
        </p>
      </div>
    </>
  );
}
