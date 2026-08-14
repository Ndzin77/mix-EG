import { Monitor, Palette, Sparkles } from "lucide-react";
import { useLogoLoja } from "@/components/pdv/faixa-marca";
import { marcaPadrao, useConfig, type MarcaConfig } from "@/lib/config";
import { useCorDaLogo } from "@/lib/cor-da-logo";
import { cn } from "@/lib/utils";

const TEMPOS = [
  { valor: 30, rotulo: "30 s" },
  { valor: 60, rotulo: "1 min" },
  { valor: 180, rotulo: "3 min" },
  { valor: 300, rotulo: "5 min" },
];

/** Chave de liga/desliga com título e explicação: uma decisão por linha. */
function Chave({
  ligada,
  onChange,
  titulo,
  ajuda,
}: {
  ligada: boolean;
  onChange: (v: boolean) => void;
  titulo: React.ReactNode;
  ajuda: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={ligada}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
      />
      <span className="text-sm">
        <span className="flex items-center gap-2 font-bold">{titulo}</span>
        <span className="block text-muted-foreground">{ajuda}</span>
      </span>
    </label>
  );
}

/** Régua contínua com o número sempre à vista — ajuste fino sem adivinhação. */
function Regua({
  rotulo,
  valor,
  min,
  max,
  onChange,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="flex items-baseline justify-between text-sm font-bold">
        {rotulo}
        <span className="money text-base text-primary">{Math.round(valor)}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--color-primary)]"
      />
    </label>
  );
}

/** Bloco nomeado: o Admin fica em três decisões, não em vinte caixinhas. */
function Bloco({
  icone: Icone,
  titulo,
  children,
}: {
  icone: typeof Sparkles;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <Icone className="size-4" />
        {titulo}
      </span>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Como a logo aparece no balcão: totem lateral, fundo e modo vitrine. */
export function CartaoMarca() {
  const [config, setConfig] = useConfig();
  const logo = useLogoLoja();
  const marca = { ...marcaPadrao, ...config.marca };
  const mudar = (p: Partial<MarcaConfig>) => setConfig({ marca: { ...marca, ...p } });
  /* A cor que manda na logo: a prévia mostra o balcão já combinando. */
  const cor = useCorDaLogo(marca.combinar ? logo : null);
  const fundoMarca = cor
    ? { backgroundImage: `radial-gradient(120% 80% at 50% 12%, ${cor.suave}, transparent 70%)` }
    : undefined;
  const minutos = Math.floor(marca.vitrineSegundos / 60);
  const segundos = marca.vitrineSegundos % 60;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <Sparkles className="size-4" />
        Logo na tela de vendas
      </span>

      {/* Prévia no topo: a dona vê o balcão antes de mexer no balcão. */}
      <div className="mt-3">
        <div className="flex h-40 overflow-hidden rounded-xl border-2 border-border">
          <div
            style={
              cor
                ? {
                    backgroundImage: `radial-gradient(70% 55% at 50% 45%, ${cor.suave}, transparent 75%)`,
                  }
                : undefined
            }
            className="relative flex-1 bg-secondary/40"
          >
            {marca.marcaDagua ? (
              <img
                src={logo}
                alt=""
                aria-hidden
                style={{ opacity: Math.min(0.3, 0.09 * (marca.intensidade / 45)) * 2.2 }}
                className="absolute left-1/2 top-1/2 w-4/5 -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            ) : null}
            <div className="relative grid h-full grid-cols-3 content-start gap-1.5 p-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-8 rounded-md bg-card" />
              ))}
            </div>
          </div>
          {marca.totem ? (
            <div
              style={fundoMarca}
              className={cn(
                "flex w-28 flex-col items-center justify-center gap-1 p-1.5",
                cor ? "bg-card" : "bg-gradient-to-b from-primary-soft to-card",
              )}
            >
              <img
                src={logo}
                alt=""
                style={{ width: `${marca.tamanho}%`, opacity: marca.opacidadeTotem / 100 }}
                className="object-contain transition-all duration-300"
              />
              <span className="w-full truncate text-center text-[9px] font-bold uppercase tracking-wide">
                {config.nomeLoja}
              </span>
            </div>
          ) : null}
          {/* a gaveta de contas recolhida, na cor da marca */}
          <div
            style={cor ? { background: cor.suave } : undefined}
            className="grid w-7 place-items-center bg-secondary text-[8px] font-bold uppercase text-muted-foreground"
          >
            <span className="[writing-mode:vertical-rl] tracking-widest">Contas</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Bloco icone={Monitor} titulo="Totem">
          <Chave
            ligada={marca.totem}
            onChange={(v) => mudar({ totem: v })}
            titulo="Coluna da marca durante a venda"
            ajuda="Logo enorme virada para o cliente, ao lado do balcão."
          />
          {marca.totem ? (
            <>
              <Regua
                rotulo="Tamanho da logo"
                valor={marca.tamanho}
                min={50}
                max={100}
                onChange={(v) => mudar({ tamanho: v })}
              />
              <Regua
                rotulo="Opacidade da logo"
                valor={marca.opacidadeTotem}
                min={40}
                max={100}
                onChange={(v) => mudar({ opacidadeTotem: v })}
              />
            </>
          ) : null}
        </Bloco>

        <Bloco icone={Palette} titulo="Fundo do balcão">
          <Chave
            ligada={marca.marcaDagua}
            onChange={(v) => mudar({ marcaDagua: v })}
            titulo="Logo clarinha atrás dos produtos"
            ajuda="Marca presente o tempo todo, sem atrapalhar a leitura."
          />
          {marca.marcaDagua ? (
            <Regua
              rotulo="Presença da marca d'água"
              valor={marca.intensidade}
              min={0}
              max={100}
              onChange={(v) => mudar({ intensidade: v })}
            />
          ) : null}
          <div className="mt-3">
            <Chave
              ligada={marca.combinar}
              onChange={(v) => mudar({ combinar: v })}
              titulo={
                <>
                  Combinar as cores com a logo
                  {cor ? (
                    <span
                      aria-hidden
                      style={{ background: cor.cor }}
                      className="size-4 rounded-full ring-2 ring-border"
                    />
                  ) : null}
                </>
              }
              ajuda={
                cor
                  ? "Trocou a logo, trocou o fundo — totem, gaveta e grade combinam sozinhos."
                  : "Assim que a logo carregar, o fundo do balcão pega a cor dela."
              }
            />
          </div>
        </Bloco>

        <Bloco icone={Sparkles} titulo="Vitrine">
          <Chave
            ligada={marca.vitrine}
            onChange={(v) => mudar({ vitrine: v })}
            titulo="Painel da marca quando ninguém mexe"
            ajuda="A tela vira vitrine em tela cheia; um toque volta ao trabalho."
          />
          {marca.vitrine ? (
            <div className="mt-3">
              <span className="text-sm font-bold">Entrar depois de</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {TEMPOS.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => mudar({ vitrineSegundos: t.valor })}
                    className={cn(
                      "press rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition-colors",
                      marca.vitrineSegundos === t.valor
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <label className="text-sm">
                  <span className="block font-bold">Minutos</span>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={minutos}
                    onChange={(e) =>
                      mudar({
                        vitrineSegundos: Math.max(15, Number(e.target.value || 0) * 60 + segundos),
                      })
                    }
                    className="money mt-1 w-20 rounded-lg border-2 border-border bg-background px-3 py-2 text-lg"
                  />
                </label>
                <label className="text-sm">
                  <span className="block font-bold">Segundos</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={segundos}
                    onChange={(e) =>
                      mudar({
                        vitrineSegundos: Math.max(
                          15,
                          minutos * 60 + Math.min(59, Number(e.target.value || 0)),
                        ),
                      })
                    }
                    className="money mt-1 w-20 rounded-lg border-2 border-border bg-background px-3 py-2 text-lg"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Mínimo de 15 segundos.</p>
            </div>
          ) : null}
        </Bloco>
      </div>
    </section>
  );
}
