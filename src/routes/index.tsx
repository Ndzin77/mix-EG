import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  Clock,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { CampoSenha } from "@/components/campo-senha";
import { criarConta } from "@/lib/cadastro.functions";
import { telefone as mascaraTelefone } from "@/lib/campos";
import { senhaValida } from "@/lib/travas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Doce PDV — sistema para sorveteria e confeitaria por R$ 39,90" },
      {
        name: "description",
        content:
          "Venda no balcão, controle comandas, saídas, fila de preparo e relatórios. Plano promocional de R$ 39,90 por mês, sem fidelidade.",
      },
      { property: "og:title", content: "Doce PDV — gestão completa por R$ 39,90/mês" },
      {
        property: "og:description",
        content:
          "PDV, comandas, caixa, recibo em bobina e relatórios num sistema só. Comece hoje por R$ 39,90 por mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const beneficios = [
  { icone: Wallet, titulo: "Venda em 3 toques", texto: "Comanda aberta, cobrança dividida e troco calculado na hora." },
  { icone: ChefHat, titulo: "Bancada compartilhada", texto: "A cozinha vê a fila por um link, sem login e sem confusão." },
  { icone: Receipt, titulo: "Recibo do seu jeito", texto: "Bobina 58/80mm ou A4, com sua logo e o que você quiser mostrar." },
  { icone: BarChart3, titulo: "Relatório que decide", texto: "Entrou, saiu, sobrou. Campeões de venda e fechamento por dia." },
  { icone: Clock, titulo: "Funciona offline", texto: "Caiu a internet? A venda continua e sobe sozinha depois." },
  { icone: ShieldCheck, titulo: "Cadeado por tela", texto: "Caixa e relatórios só abrem com a senha que você definir." },
];

function LandingPage() {
  const [aberto, setAberto] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="font-display text-xl tracking-wide">Doce PDV</span>
        <Link
          to="/auth"
          className="press rounded-xl border-2 border-border px-4 py-2 text-sm font-bold hover:border-primary"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-10 pt-6 text-center">
        <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
          <Sparkles className="size-4" />
          Promoção de lançamento
        </span>
        <h1 className="mt-4 font-display text-4xl leading-tight tracking-wide sm:text-6xl">
          O caixa da sua sorveteria fechando certo todo dia
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Vendas, comandas, saídas, fila de preparo, recibo e relatórios num sistema só — feito
          para o balcão cheio, no celular ou no computador.
        </p>

        <div className="mx-auto mt-8 w-full max-w-md rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-xl">
          <p className="eyebrow text-muted-foreground">Plano mensal</p>
          <p className="mt-1 flex items-end justify-center gap-1">
            <span className="text-sm font-bold text-muted-foreground line-through">R$ 89,90</span>
          </p>
          <p className="money font-display text-6xl tracking-wide">
            R$ 39<span className="text-3xl">,90</span>
          </p>
          <p className="text-sm font-bold text-muted-foreground">por mês · sem fidelidade</p>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="press glow-primary mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-display text-2xl tracking-wider text-primary-foreground"
          >
            Começar agora
            <ArrowRight className="size-6" />
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Você configura a loja antes de pagar. Leva menos de 1 minuto.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-3 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {beneficios.map((b) => (
          <article key={b.titulo} className="rounded-2xl border border-border bg-card p-5">
            <b.icone className="size-6 text-primary" />
            <h2 className="mt-2 font-display text-xl tracking-wide">{b.titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{b.texto}</p>
          </article>
        ))}
      </section>

      {aberto ? <ModalCadastro onFechar={() => setAberto(false)} /> : null}
    </main>
  );
}

/** Cadastro em 3 passos: um pedido por vez, barra de progresso à vista. */
function ModalCadastro({ onFechar }: { onFechar: () => void }) {
  const navigate = useNavigate();
  const criar = useServerFn(criarConta);
  const [passo, setPasso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [f, setF] = useState({ loja: "", responsavel: "", telefone: "", email: "", senha: "" });

  const campo =
    "mt-1.5 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-lg font-normal outline-none focus:border-primary focus:bg-card";

  const ok = [
    f.loja.trim().length >= 2 && f.telefone.replace(/\D/g, "").length >= 10,
    /.+@.+\..+/.test(f.email) && senhaValida(f.senha) && f.senha.length >= 6,
    f.responsavel.trim().length >= 2,
  ];

  async function concluir() {
    if (enviando) return;
    setEnviando(true);
    try {
      const r = await criar({ data: { ...f, email: f.email.trim() } });
      toast.success("Conta criada! Agora é só ativar o plano.");
      if (r.checkout) window.location.href = r.checkout;
      else navigate({ to: "/auth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui criar a conta.");
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Criar minha loja"
      subtitulo="Três perguntas rápidas e o sistema já nasce configurado."
      onFechar={onFechar}
      rodape={
        <>
          {passo > 0 ? (
            <button
              type="button"
              onClick={() => setPasso((p) => p - 1)}
              className="press h-14 rounded-xl border-2 border-border px-5 font-bold"
            >
              Voltar
            </button>
          ) : null}
          <button
            type="button"
            disabled={!ok[passo] || enviando}
            onClick={() => (passo === 2 ? void concluir() : setPasso((p) => p + 1))}
            className="press h-14 flex-1 rounded-xl bg-primary font-display text-xl tracking-wide text-primary-foreground disabled:opacity-40"
          >
            {passo === 2 ? (enviando ? "Criando…" : "Criar e pagar R$ 39,90") : "Continuar"}
          </button>
        </>
      }
    >
      <div className="mb-4 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              n <= passo ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      {passo === 0 ? (
        <div className="grid gap-4">
          <label className="text-sm font-bold">
            Nome da loja
            <input
              autoFocus
              value={f.loja}
              placeholder="EG Mix Sorveteria"
              onChange={(e) => setF({ ...f, loja: e.target.value.slice(0, 80) })}
              className={campo}
            />
          </label>
          <label className="text-sm font-bold">
            Telefone / WhatsApp
            <input
              inputMode="tel"
              value={f.telefone}
              placeholder="(00) 00000-0000"
              onChange={(e) => setF({ ...f, telefone: mascaraTelefone(e.target.value) })}
              className={cn(campo, "money")}
            />
          </label>
        </div>
      ) : passo === 1 ? (
        <div className="grid gap-4">
          <label className="text-sm font-bold">
            E-mail de acesso
            <input
              autoFocus
              type="email"
              value={f.email}
              placeholder="voce@email.com"
              onChange={(e) => setF({ ...f, email: e.target.value.slice(0, 160) })}
              className={campo}
            />
          </label>
          <CampoSenha
            rotulo="Senha de acesso"
            placeholder="mínimo 6 caracteres"
            valor={f.senha}
            onChange={(v) => setF({ ...f, senha: v })}
          />
          {f.senha.length > 0 && f.senha.length < 6 ? (
            <p className="text-xs font-bold text-danger">A senha do login precisa de 6 ou mais.</p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4">
          <label className="text-sm font-bold">
            Seu nome
            <input
              autoFocus
              value={f.responsavel}
              placeholder="Elaine"
              onChange={(e) => setF({ ...f, responsavel: e.target.value.slice(0, 80) })}
              className={campo}
            />
          </label>
          <div className="rounded-2xl border-2 border-primary/30 bg-secondary/40 p-4">
            <p className="eyebrow text-muted-foreground">Confira</p>
            <ul className="mt-2 grid gap-1 text-sm font-bold">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {f.loja}
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {f.telefone}
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {f.email}
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Ao continuar você vai para o pagamento seguro. O acesso libera assim que o pagamento
              é aprovado.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
