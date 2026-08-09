import { useEffect, useState } from "react";
import { Check, Download, Monitor, Share, Smartphone } from "lucide-react";
import { Modal } from "@/components/modal";

/** Evento que o navegador dispara quando o app pode ser instalado. */
type PromptInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Instalar o app. Android e computador aceitam o convite do próprio navegador;
 * o iPhone não tem esse convite, então mostramos o passo a passo com desenho.
 */
export function CartaoInstalar() {
  const [convite, setConvite] = useState<PromptInstalar | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [passoAPasso, setPassoAPasso] = useState(false);

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
    await convite.prompt();
    const { outcome } = await convite.userChoice;
    if (outcome === "accepted") setInstalado(true);
    setConvite(null);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <Download className="size-4" />
        Instalar o app
      </span>
      <p className="mt-1 text-xs text-muted-foreground">
        Instalado, o sistema abre por um ícone, em tela cheia e sem barra de navegador — e
        continua funcionando quando a internet cai.
      </p>

      {instalado ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-3 text-sm font-bold text-success">
          <Check className="size-5" />
          Já está instalado neste aparelho.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => void instalar()}
            className="press flex h-14 items-center justify-center gap-2 rounded-xl bg-primary font-display text-xl tracking-wide text-primary-foreground"
          >
            <Smartphone className="size-5" />
            Instalar no celular
          </button>
          <button
            type="button"
            onClick={() => void instalar()}
            className="press flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-border font-bold hover:border-primary"
          >
            <Monitor className="size-5" />
            Instalar no computador
          </button>
          <button
            type="button"
            onClick={() => setPassoAPasso(true)}
            className="text-xs font-bold text-muted-foreground underline underline-offset-4"
          >
            Estou no iPhone / não apareceu o convite
          </button>
        </div>
      )}

      {passoAPasso ? (
        <Modal
          titulo="Instalar sem o convite do navegador"
          subtitulo="Três toques e o ícone aparece na tela inicial."
          onFechar={() => setPassoAPasso(false)}
        >
          <ol className="grid gap-3 text-sm">
            <li className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-black text-primary-foreground">
                1
              </span>
              <span>
                <strong>iPhone (Safari):</strong> toque no botão{" "}
                <Share className="inline size-4 align-text-bottom" /> Compartilhar, na barra de
                baixo.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-black text-primary-foreground">
                2
              </span>
              <span>
                Role e escolha <strong>“Adicionar à Tela de Início”</strong>, depois{" "}
                <strong>Adicionar</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-black text-primary-foreground">
                3
              </span>
              <span>
                <strong>Computador (Chrome/Edge):</strong> clique no ícone de instalar na ponta
                direita da barra de endereço, ou menu ⋮ →{" "}
                <strong>Instalar / Adicionar à área de trabalho</strong>.
              </span>
            </li>
          </ol>
        </Modal>
      ) : null}
    </section>
  );
}
