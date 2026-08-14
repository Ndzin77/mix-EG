import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Marca da loja sem imagem quebrada.
 *
 * Neurociência: o ícone de "imagem faltando" é ruído puro — o olho para nele
 * e a confiança na tela cai. Quando não há logo (loja recém-criada) ou o
 * arquivo não carrega, entra um monograma na cor da casa: mesma silhueta,
 * mesma posição, zero susto. A identidade fica sempre no mesmo canto do olho.
 */
export function iniciaisDaLoja(nome?: string | null) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "•";
  return partes
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Monograma({
  nome,
  className,
  style,
}: {
  nome?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "fade-in grid select-none place-items-center bg-primary-soft font-display leading-none tracking-wide text-primary",
        className,
      )}
    >
      <span className="text-[0.5em]">{iniciaisDaLoja(nome)}</span>
    </span>
  );
}

/** Imagem da marca com rede de segurança: falhou, vira monograma na hora. */
export function LogoMarca({
  src,
  nome,
  alt,
  className,
  style,
}: {
  src?: string | null;
  nome?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [src]);

  if (!src || falhou) return <Monograma nome={nome} className={className} style={style} />;
  return (
    <img
      src={src}
      alt={alt ?? `Logo ${nome ?? ""}`.trim()}
      onError={() => setFalhou(true)}
      style={style}
      className={className}
    />
  );
}
