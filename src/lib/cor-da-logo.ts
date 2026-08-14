import { useEffect, useState } from "react";

/** O que sabemos sobre a cor da logo depois de olhar os pixels dela. */
export type CorDaLogo = {
  /** cor dominante em rgb() pronto para CSS */
  cor: string;
  /** versão bem diluída, para fundo */
  suave: string;
  /** a logo é clara (fundo branco/pastel) ou escura? */
  clara: boolean;
  /** 0..1 — o quanto essa cor é viva; guia a opacidade da marca d'água */
  vivacidade: number;
};

const cache = new Map<string, CorDaLogo | null>();
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((f) => f());
}

/**
 * Lê a logo num canvas fora da tela e tira dela a cor que manda: ignora
 * transparência e quase-branco, agrupa os pixels em caixinhas de cor e fica
 * com a caixinha mais colorida e mais cheia. Uma vez por URL — depois é cache.
 */
function analisar(url: string) {
  if (cache.has(url)) return;
  cache.set(url, null);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const lado = 64;
      const cv = document.createElement("canvas");
      cv.width = lado;
      cv.height = lado;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, lado, lado);
      const { data } = ctx.getImageData(0, 0, lado, lado);

      const caixas = new Map<string, { r: number; g: number; b: number; n: number; s: number }>();
      let claros = 0;
      let considerados = 0;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]!;
        if (a < 128) continue;
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        considerados++;
        if (lum > 0.72) claros++;
        /* branco, preto e cinza não contam como "cor da marca" */
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.18 || lum > 0.94 || lum < 0.06) continue;
        const chave = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const c = caixas.get(chave) ?? { r: 0, g: 0, b: 0, n: 0, s: 0 };
        c.r += r;
        c.g += g;
        c.b += b;
        c.s += sat;
        c.n += 1;
        caixas.set(chave, c);
      }

      let melhor: { r: number; g: number; b: number; n: number; s: number } | null = null;
      let melhorNota = 0;
      caixas.forEach((c) => {
        const nota = c.n * (0.4 + (c.s / c.n) * 0.6);
        if (nota > melhorNota) {
          melhorNota = nota;
          melhor = c;
        }
      });
      if (!melhor) return;
      const m = melhor as { r: number; g: number; b: number; n: number; s: number };

      const r = Math.round(m.r / m.n);
      const g = Math.round(m.g / m.n);
      const b = Math.round(m.b / m.n);
      const vivacidade = Math.min(1, m.s / m.n);
      const clara = considerados > 0 && claros / considerados > 0.5;

      cache.set(url, {
        cor: `rgb(${r} ${g} ${b})`,
        suave: `rgb(${r} ${g} ${b} / 0.14)`,
        clara,
        vivacidade,
      });
      avisar();
    } catch {
      /* imagem de outro domínio sem permissão: fica no tema da casa */
    }
  };
  img.onerror = () => {
    /* nada a fazer: o tema atual segue valendo */
  };
  img.src = url;
}

/**
 * A cor da logo, seja ela qual for. Devolve `null` enquanto não sabe (ou se
 * não deu para ler) — quem usa cai no tema da casa sem piscar.
 */
export function useCorDaLogo(url?: string | null): CorDaLogo | null {
  const [, forcar] = useState(0);

  useEffect(() => {
    if (!url || typeof window === "undefined") return;
    const rerender = () => forcar((v) => v + 1);
    ouvintes.add(rerender);
    analisar(url);
    return () => {
      ouvintes.delete(rerender);
    };
  }, [url]);

  return url ? (cache.get(url) ?? null) : null;
}
