import { useEffect, useMemo, useRef, useState } from "react";
import { LogoMarca, Monograma } from "@/components/marca-loja";
import { useConfig } from "@/lib/config";
import { useCorDaLogo } from "@/lib/cor-da-logo";
import { useImagem } from "@/lib/imagens";
import { cn } from "@/lib/utils";

/** A logo da loja: a que a dona subiu no Admin (ou nada, e entra o monograma). */
export function useLogoLoja() {
  const [config] = useConfig();
  return useImagem(config.logoUrl) || undefined;
}

/**
 * O fundo do balcão nas cores da logo. Quando não dá para ler a imagem (ou a
 * dona desligou), volta o gradiente da casa — nada quebra, só não combina.
 */
export function useFundoDaMarca(): { style?: React.CSSProperties; classe: string } {
  const [config] = useConfig();
  const logo = useLogoLoja();
  const cor = useCorDaLogo(config.marca.combinar ? logo : null);
  if (!cor) return { classe: "bg-gradient-to-b from-primary-soft via-card to-secondary" };
  return {
    classe: "bg-card",
    style: {
      backgroundImage: `radial-gradient(120% 80% at 50% 12%, ${cor.suave}, transparent 70%), linear-gradient(to bottom, ${cor.suave}, transparent 55%)`,
    },
  };
}

/**
 * Totem da marca: coluna própria ao lado da venda, onde a logo pode ser
 * enorme sem disputar espaço com a busca nem com o carrinho. Entra uma vez,
 * com calma, e depois fica parada — nada pisca no canto do olho de quem
 * está vendendo. A emenda com a grade é uma vinheta, não uma borda dura:
 * o olho lê um balcão só e gasta atenção nos produtos.
 */
export function TotemMarca({ largo }: { largo?: boolean }) {
  const [config] = useConfig();
  const logo = useLogoLoja();
  const fundo = useFundoDaMarca();
  if (!config.marca.totem) return null;

  return (
    <div
      style={fundo.style}
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center gap-5 overflow-hidden px-4 py-6",
        fundo.classe,
      )}
    >
      {/* vinheta na emenda: profundidade no lugar de fronteira */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/[0.06] to-transparent"
      />
      {/* A opacidade vive no invólucro: a animação de entrada da logo tem
          fill-mode "both" e sobrescreveria qualquer opacidade na própria img. */}
      <div
        style={{ opacity: config.marca.opacidadeTotem / 100, width: largo ? "98%" : `${config.marca.tamanho}%` }}
        className="flex w-full justify-center transition-opacity duration-300"
      >
        <LogoMarca
          src={logo}
          nome={config.nomeLoja}
          className="logo-marca aspect-square w-full max-h-[62%] rounded-[2rem] object-contain text-[6rem] drop-shadow-2xl transition-all duration-300 ease-out"
        />
      </div>

      <p className="text-balance text-center font-display text-2xl leading-tight tracking-wide xl:text-3xl">
        {config.nomeLoja}
      </p>
    </div>
  );
}

/**
 * Logo translúcida atrás da grade: a marca fica no fundo do olhar, sem
 * atrapalhar. A opacidade parte da própria logo — logo clara pede mais, logo
 * escura e saturada pede menos — e o controle do Admin puxa essa base para
 * cima ou para baixo. As bordas somem numa máscara suave, para parecer parte
 * do papel e não uma figura colada.
 */
export function MarcaDagua() {
  const [config] = useConfig();
  const logo = useLogoLoja();
  const cor = useCorDaLogo(config.marca.combinar ? logo : null);
  if (!config.marca.marcaDagua) return null;

  /* A régua manda: 0 = invisível, 100 = sólida. Sem teto escondido. */
  const opacidade = Math.min(1, Math.max(0, config.marca.intensidade / 100));
  const mascara = "radial-gradient(closest-side, #000 45%, transparent 92%)";


  return (
    <>
      {cor ? (
        <div
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(70% 55% at 50% 45%, ${cor.suave}, transparent 75%)`,
          }}
          className="pointer-events-none absolute inset-0 z-0"
        />
      ) : null}
      {logo ? (
      <img
        src={logo}
        alt=""
        aria-hidden
        style={{
          opacity: opacidade,
          maskImage: mascara,
          WebkitMaskImage: mascara,
        }}
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[80%] max-w-2xl -translate-x-1/2 -translate-y-1/2 select-none transition-opacity duration-300"
      />
      ) : null}
    </>
  );
}

/**
 * Modo vitrine: parado tempo demais, o balcão vira painel da marca. Aqui o
 * movimento é bem-vindo — ninguém está vendendo. Qualquer toque volta
 * exatamente para onde estava.
 */
export function ModoVitrine({ ativo = true }: { ativo?: boolean }) {
  const [config] = useConfig();
  const logo = useLogoLoja();
  const fundo = useFundoDaMarca();
  const [mostrando, setMostrando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ligado = ativo && config.marca.vitrine;
  const segundos = useMemo(
    () => Math.max(15, config.marca.vitrineSegundos),
    [config.marca.vitrineSegundos],
  );

  useEffect(() => {
    if (!ligado) {
      setMostrando(false);
      return;
    }
    const rearmar = () => {
      setMostrando(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMostrando(true), segundos * 1000);
    };
    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    eventos.forEach((e) => window.addEventListener(e, rearmar, { passive: true }));
    rearmar();
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, rearmar));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ligado, segundos]);

  if (!mostrando) return null;

  return (
    <div
      onPointerDown={() => setMostrando(false)}
      style={fundo.style}
      className={cn("vitrine-in fixed inset-0 z-50 grid cursor-pointer place-items-center", fundo.classe)}
    >
      <div className="flex flex-col items-center gap-6 px-8 text-center">
        {logo ? (
          <img
            src={logo}
            alt={config.nomeLoja}
            className="logo-flutua w-[min(70vw,32rem)] object-contain drop-shadow-2xl"
          />
        ) : (
          <Monograma
            nome={config.nomeLoja}
            className="logo-flutua size-[min(50vw,22rem)] rounded-[3rem] text-[12rem] drop-shadow-2xl"
          />
        )}
        <p className="font-display text-4xl tracking-wide sm:text-6xl">{config.nomeLoja}</p>
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Toque para voltar
        </p>
      </div>
    </div>
  );
}
