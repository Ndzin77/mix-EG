/** Períodos prontos + intervalo livre, no estilo dos gerenciadores de anúncio:
 *  a dona escolhe "Ontem" num toque ou marca de tal dia a tal dia. */
export const presets = ["hoje", "ontem", "7d", "30d", "mes", "mesPassado"] as const;
export type PresetId = (typeof presets)[number];

export const rotuloPreset: Record<PresetId, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  mesPassado: "Mês passado",
};

export const rotuloForma: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  debit: "Débito",
  credit: "Crédito",
  other: "Outros",
};

export type Faixa = { inicio: Date; fim: Date };
/** Intervalo de dias inclusivo, em YYYY-MM-DD. */
export type Intervalo = { de: string; ate: string };

export const arred = (n: number) => Math.round(n * 100) / 100;

const DIA = 86_400_000;

export const diaIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Meia-noite local do dia, mesmo quando quem calcula é o servidor (UTC).
 *  `offsetMin` é o `getTimezoneOffset()` do navegador da loja. */
export function instante(dia: string, offsetMin: number, somarDias = 0) {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + somarDias) + offsetMin * 60_000);
}

/** Data vista com os olhos da loja: use os getters UTC no resultado. */
export const naLoja = (iso: string | Date, offsetMin: number) =>
  new Date(new Date(iso).getTime() - offsetMin * 60_000);

/** Recorte de dias no relógio da loja (fim exclusivo), em ISO para o banco.
 *  O servidor roda em UTC: sem o fuso, venda das 22h cairia no dia seguinte. */
export function faixaDaLoja(de: string | undefined, ate: string | undefined, offsetMin: number) {
  const hoje = new Date(Date.now() - offsetMin * 60_000).toISOString().slice(0, 10);
  const primeiro = de ?? hoje;
  const ultimo = ate ?? primeiro;
  return {
    inicio: instante(primeiro, offsetMin).toISOString(),
    fim: instante(ultimo, offsetMin, 1).toISOString(),
    dia: primeiro,
  };
}

/** Intervalo pronto de cada atalho, em dias locais. */
export function intervaloPreset(p: PresetId, hoje = new Date()): Intervalo {
  const base = new Date(hoje);
  base.setHours(0, 0, 0, 0);

  if (p === "hoje") return { de: diaIso(base), ate: diaIso(base) };
  if (p === "ontem") {
    const d = new Date(base.getTime() - DIA);
    return { de: diaIso(d), ate: diaIso(d) };
  }
  if (p === "7d") return { de: diaIso(new Date(base.getTime() - 6 * DIA)), ate: diaIso(base) };
  if (p === "30d") return { de: diaIso(new Date(base.getTime() - 29 * DIA)), ate: diaIso(base) };
  if (p === "mes") {
    const i = new Date(base.getFullYear(), base.getMonth(), 1);
    return { de: diaIso(i), ate: diaIso(base) };
  }
  const i = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const f = new Date(base.getFullYear(), base.getMonth(), 0);
  return { de: diaIso(i), ate: diaIso(f) };
}

/** Qual atalho corresponde ao intervalo atual (para acender o botão certo). */
export function presetDoIntervalo(intervalo: Intervalo): PresetId | null {
  return (
    presets.find((p) => {
      const i = intervaloPreset(p);
      return i.de === intervalo.de && i.ate === intervalo.ate;
    }) ?? null
  );
}

export const diasNoIntervalo = ({ de, ate }: Intervalo) =>
  Math.max(1, Math.round((instante(ate, 0).getTime() - instante(de, 0).getTime()) / DIA) + 1);

/** Semana do mês como a loja conta: quebra sempre no sábado, e as pontas
 *  respeitam o mês (a 1ª começa no dia 1º, a última acaba no último dia). */
export type SemanaMes = { n: number; de: string; ate: string };

export function semanasDoMes(ano: number, mes: number): SemanaMes[] {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const lista: SemanaMes[] = [];
  let inicio = 1;
  let n = 1;
  while (inicio <= ultimo) {
    const dow = new Date(ano, mes, inicio).getDay();
    const fim = Math.min(inicio + (6 - dow), ultimo);
    lista.push({
      n,
      de: diaIso(new Date(ano, mes, inicio)),
      ate: diaIso(new Date(ano, mes, fim)),
    });
    inicio = fim + 1;
    n += 1;
  }
  return lista;
}

/** Mês (ano + índice) a que um intervalo pertence, pelo dia inicial. */
export function mesDoIntervalo({ de }: Intervalo) {
  const [y, m] = de.split("-").map(Number);
  return { ano: y ?? 1970, mes: (m ?? 1) - 1 };
}

/** Se o intervalo é exatamente uma semana do mês, qual é. */
export function semanaDoIntervalo(intervalo: Intervalo): SemanaMes | null {
  const { ano, mes } = mesDoIntervalo(intervalo);
  return (
    semanasDoMes(ano, mes).find((s) => s.de === intervalo.de && s.ate === intervalo.ate) ?? null
  );
}

/** Mês inteiro, do dia 1º ao último — base do seletor de semanas. */
export function intervaloMes(ano: number, mes: number): Intervalo {
  return {
    de: diaIso(new Date(ano, mes, 1)),
    ate: diaIso(new Date(ano, mes + 1, 0)),
  };
}

export const rotuloMes = (ano: number, mes: number) =>
  new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

/** Recorte pedido e o período imediatamente anterior, do mesmo tamanho. */
export function faixas(intervalo: Intervalo, offsetMin: number): { atual: Faixa; anterior: Faixa } {
  const dias = diasNoIntervalo(intervalo);
  const inicio = instante(intervalo.de, offsetMin);
  const fim = instante(intervalo.ate, offsetMin, 1);
  return {
    atual: { inicio, fim },
    anterior: {
      inicio: new Date(inicio.getTime() - dias * DIA),
      fim: new Date(inicio.getTime()),
    },
  };
}

const ddmm = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Rótulos das barras e a função que joga cada instante na barra certa. */
export function eixo(intervalo: Intervalo, offsetMin: number) {
  const dias = diasNoIntervalo(intervalo);

  if (dias === 1) {
    const horas = [8, 10, 12, 14, 16, 18, 20, 22];
    return {
      rotulos: horas.map((h) => `${String(h).padStart(2, "0")}h`),
      indice: (d: Date) => {
        const h = naLoja(d, offsetMin).getUTCHours();
        let i = 0;
        for (let k = 0; k < horas.length; k++) if (h >= horas[k]!) i = k;
        return i;
      },
    };
  }

  const inicioUtc = instante(intervalo.de, 0).getTime();
  const passo = dias <= 31 ? 1 : Math.ceil(dias / 12);
  const baldes = Math.ceil(dias / passo);

  return {
    rotulos: Array.from({ length: baldes }, (_, i) => ddmm(new Date(inicioUtc + i * passo * DIA))),
    indice: (d: Date) => {
      const local = naLoja(d, offsetMin);
      const meiaNoite = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
      return Math.min(Math.max(Math.floor((meiaNoite - inicioUtc) / DIA / passo), 0), baldes - 1);
    },
  };
}

/** Texto curto do intervalo para cabeçalho, botão e nome do arquivo. */
export function rotuloIntervalo(intervalo: Intervalo) {
  const preset = presetDoIntervalo(intervalo);
  if (preset) return rotuloPreset[preset];
  const semana = semanaDoIntervalo(intervalo);
  if (semana) {
    return `Semana ${semana.n} · ${ddmm(instante(semana.de, 0))}–${ddmm(instante(semana.ate, 0))}`;
  }
  const de = ddmm(instante(intervalo.de, 0));
  const ate = ddmm(instante(intervalo.ate, 0));
  return de === ate ? de : `${de} a ${ate}`;
}

/** Como chamar o período anterior na comparação. */
export function rotuloAnterior(intervalo: Intervalo) {
  const preset = presetDoIntervalo(intervalo);
  if (preset === "hoje") return "que ontem";
  if (preset === "mes") return "que o mês passado";
  if (preset === "mesPassado") return "que o mês anterior";
  const dias = diasNoIntervalo(intervalo);
  return dias === 1 ? "que o dia anterior" : `que os ${dias} dias anteriores`;
}

/** Variação percentual entre dois números, tolerante a zero. */
export function variacao(agora: number, antes: number): number | null {
  if (!antes) return agora > 0 ? 100 : null;
  return Math.round(((agora - antes) / antes) * 100);
}

/* ---------- Modos de semana ----------------------------------------------
 * A loja conta semana de três jeitos, e cada um responde a uma pergunta:
 *  "fixa"  → dias 1–7, 8–14…  (comparar o mesmo pedaço de todo mês)
 *  "mes"   → quebra no sábado (o fim de semana inteiro fica junto)
 *  "ano"   → semana 1…53 do ano (visão longa, sem se prender ao mês)      */
export const modosSemana = ["fixa", "mes", "ano"] as const;
export type ModoSemana = (typeof modosSemana)[number];

export const rotuloModoSemana: Record<ModoSemana, string> = {
  fixa: "1 a 7",
  mes: "Do mês",
  ano: "Do ano",
};

/** Blocos fixos de 7 dias dentro do mês (1–7, 8–14, …). */
export function semanasFixas(ano: number, mes: number): SemanaMes[] {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const lista: SemanaMes[] = [];
  let n = 1;
  for (let inicio = 1; inicio <= ultimo; inicio += 7) {
    const fim = Math.min(inicio + 6, ultimo);
    lista.push({ n, de: diaIso(new Date(ano, mes, inicio)), ate: diaIso(new Date(ano, mes, fim)) });
    n += 1;
  }
  return lista;
}

/** Semanas do ano inteiro, sempre de domingo a sábado, aparadas no ano. */
export function semanasDoAno(ano: number): SemanaMes[] {
  const primeiro = new Date(ano, 0, 1);
  const ultimoDia = new Date(ano, 11, 31);
  const lista: SemanaMes[] = [];
  let inicio = new Date(primeiro);
  let n = 1;
  while (inicio <= ultimoDia) {
    const fimSemana = new Date(inicio);
    fimSemana.setDate(inicio.getDate() + (6 - inicio.getDay()));
    const fim = fimSemana > ultimoDia ? ultimoDia : fimSemana;
    lista.push({ n, de: diaIso(inicio), ate: diaIso(fim) });
    inicio = new Date(fim);
    inicio.setDate(inicio.getDate() + 1);
    n += 1;
  }
  return lista;
}

/** Lista de semanas do modo escolhido. */
export function semanasDoModo(modo: ModoSemana, ano: number, mes: number): SemanaMes[] {
  if (modo === "fixa") return semanasFixas(ano, mes);
  if (modo === "ano") return semanasDoAno(ano);
  return semanasDoMes(ano, mes);
}

/** Se o intervalo é exatamente uma semana do modo, qual é. */
export function semanaDoModo(
  modo: ModoSemana,
  intervalo: Intervalo,
  ano: number,
  mes: number,
): SemanaMes | null {
  return (
    semanasDoModo(modo, ano, mes).find(
      (s) => s.de === intervalo.de && s.ate === intervalo.ate,
    ) ?? null
  );
}
