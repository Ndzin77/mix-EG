import { useEffect, useState } from "react";
import { Check, Download, Share, Smartphone } from "lucide-react";
import { Modal } from "@/components/modal";

/** Evento que o navegador dispara quando o app pode ser instalado. */
type PromptInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const ehIphone = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !("MSStream" in window);

/**
 * Instalar o app com um toque. Onde o navegador deixa (Android, Chrome/Edge
 * no computador) a instalação abre na hora; no iPhone, onde a Apple não
 * permite instalação automática, o mesmo botão abre o caminho apontado.
 */
export function CartaoInstalar() {
  const [convite, setConvite] = useState<PromptInstalar | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [passoAPasso, setPassoAPasso] = useState(false);
  const [tentando, setTentando] = useState(false);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setConvite(e as PromptInstalar);
    };
    const pronto = () => {
      setInstalado(true);
      setConvite(null);
    };
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", pronto);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalado(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", pronto);
    };
  }, []);

  const instalar = async () => {
    if (!convite) return setPassoAPasso(true);
    setTentando(true);
    try {
      await convite.prompt();
      const { outcome } = await convite.userChoice;
      if (outcome === "accepted") setInstalado(true);
      setConvite(null);
    } finally {
      setTentando(false);
    }
  };

  /* Já instalado: o cartão vira só uma confirmação curta, sem ocupar espaço. */
  if (instalado) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success-soft p-4">
        <Check className="size-6 shrink-0 text-success" />
        <p className="text-sm font-bold text-success">App instalado neste aparelho.</p>
      </section>
    );
  }

  const automatico = Boolean(convite);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <Download className="size-4" />
        Instalar o app
      </span>
      <p className="mt-1 text-xs text-muted-foreground">
        Abre por um ícone, em tela cheia, e continua funcionando quando a internet cai.
      </p>

      <button
        type="button"
        onClick={() => void instalar()}
        disabled={tentando}
        className="press mt-3 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary font-display text-2xl tracking-wide text-primary-foreground shadow-lg disabled:opacity-60"
      >
        <Smartphone className="size-6" />
        {tentando ? "Abrindo…" : "Instalar agora"}
      </button>

      <p className="mt-2 text-center text-[0.6875rem] font-bold text-muted-foreground">
        {automatico
          ? "Um toque: o próprio aparelho confirma."
          : ehIphone()
            ? "No iPhone a Apple pede três toques — mostramos onde."
            : "Se o aparelho não abrir sozinho, mostramos o caminho."}
      </p>

      {passoAPasso ? (
        <Modal
          titulo="Três toques e o ícone aparece"
          subtitulo="Este aparelho não deixa o site instalar sozinho — o caminho é este."
          onFechar={() => setPassoAPasso(false)}
        >
          <ol className="grid gap-3 text-sm">
            <li className="rise-in flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-black text-primary-foreground">
                1
              </span>
              <span>
                <strong>iPhone (Safari):</strong> toque no botão{" "}
                <Share className="inline size-4 align-text-bottom" /> Compartilhar, na barra de
                baixo.
              </span>
            </li>
            <li
              className="rise-in flex items-start gap-3 rounded-xl bg-secondary/50 p-3"
              style={{ animationDelay: "80ms" }}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-black text-primary-foreground">
                2
              </span>
              <span>
                Role e escolha <strong>“Adicionar à Tela de Início”</strong>, depois{" "}
                <strong>Adicionar</strong>.
              </span>
            </li>
            <li
              className="rise-in flex items-start gap-3 rounded-xl bg-secondary/50 p-3"
              style={{ animationDelay: "160ms" }}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-black text-primary-foreground">
                3
              </span>
              <span>
                <strong>Computador (Chrome/Edge):</strong> ícone de instalar na ponta direita da
                barra de endereço, ou menu ⋮ → <strong>Instalar</strong>.
              </span>
            </li>
          </ol>
        </Modal>
      ) : null}
    </section>
  );
}
