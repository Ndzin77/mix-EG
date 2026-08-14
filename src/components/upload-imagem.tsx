import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { enviarImagem, useImagem } from "@/lib/imagens";
import { cn } from "@/lib/utils";

/**
 * Foto de produto / logo da loja. O upload é o caminho principal (um toque,
 * do celular ou do computador); o link fica como alternativa recolhida.
 */
export function UploadImagem({
  valor,
  onChange,
  pasta,
  rotulo = "Imagem",
  redonda,
}: {
  valor: string;
  onChange: (v: string) => void;
  pasta: string;
  rotulo?: string;
  redonda?: boolean;
}) {
  const [enviando, setEnviando] = useState(false);
  const [modoLink, setModoLink] = useState(false);
  const [link, setLink] = useState(valor.startsWith("http") ? valor : "");
  const arquivoRef = useRef<HTMLInputElement>(null);
  const previa = useImagem(valor);

  async function escolher(arquivo?: File | null) {
    if (!arquivo) return;
    setEnviando(true);
    try {
      onChange(await enviarImagem(arquivo, pasta));
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem");
    } finally {
      setEnviando(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="text-sm font-bold">{rotulo}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <div
          className={cn(
            "grid size-20 shrink-0 place-items-center overflow-hidden border-2 border-dashed border-border bg-secondary/40",
            redonda ? "rounded-full" : "rounded-xl",
          )}
        >
          {previa ? (
            <img src={previa} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-7 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <button
            type="button"
            disabled={enviando}
            onClick={() => arquivoRef.current?.click()}
            className="press flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {valor ? "Trocar foto" : "Enviar foto"}
          </button>
          <button
            type="button"
            onClick={() => setModoLink((v) => !v)}
            className="press flex h-11 items-center gap-2 rounded-xl border-2 border-border px-3 text-sm font-bold text-muted-foreground hover:border-primary/60"
          >
            <Link2 className="size-4" />
            Link
          </button>
          {valor ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setLink("");
              }}
              aria-label="Remover imagem"
              className="press grid size-11 place-items-center rounded-xl border-2 border-border text-danger hover:bg-danger-soft"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={arquivoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void escolher(e.target.files?.[0])}
      />

      {modoLink ? (
        <div className="mt-2 flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            aria-label="Link da imagem"
            className="h-11 min-w-0 flex-1 rounded-xl border-2 border-border bg-secondary/30 px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => {
              if (!/^https?:\/\//.test(link.trim())) return toast.error("Cole um link começando com https://");
              onChange(link.trim());
              setModoLink(false);
            }}
            className="press h-11 shrink-0 rounded-xl border-2 border-border px-4 text-sm font-bold"
          >
            Usar
          </button>
        </div>
      ) : null}
    </div>
  );
}
