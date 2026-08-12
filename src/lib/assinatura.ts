/**
 * Assinatura: regras que valem no servidor e no navegador.
 *
 * Fica fora do arquivo de server functions de propósito — lá só moram as
 * funções, para o empacotamento não deixar helper nenhum para trás.
 */

/** Tolerância da casa: sete dias depois do vencimento o acesso fecha. */
export const CARENCIA_DIAS = 7;

/** Preço promocional de lançamento. */
export const PRECO_MENSAL = 39.9;

/** Página de pagamento do plano (Kirvano). */
export const PLANO_URL = "https://pay.kirvano.com/dba076f9-32d8-4e3e-b0ce-d6ec34c27877";

/**
 * Endereço que a Kirvano chama. É o domínio fixo do projeto, não o domínio
 * comercial: trocar de domínio (ou usar vários) não quebra a cobrança.
 */
export const WEBHOOK_URL =
  "https://project--4ef6b9e4-bd23-4919-a84d-1a59ec6d32ca.lovable.app/api/public/kirvano";

/**
 * Planos aceitos. Quem manda é a Kirvano: o nome da oferta vira um destes,
 * e a duração do ciclo passa a valer para a data e para o anel da tela.
 * Vender uma oferta nova (anual, semestral…) não pede mexer no código.
 */
export const PLANOS = {
  semanal: { rotulo: "semanal", dias: 7, sufixo: "/semana" },
  quinzenal: { rotulo: "quinzenal", dias: 15, sufixo: "/quinzena" },
  mensal: { rotulo: "mensal", dias: 30, sufixo: "/mês" },
  bimestral: { rotulo: "bimestral", dias: 60, sufixo: "/2 meses" },
  trimestral: { rotulo: "trimestral", dias: 90, sufixo: "/trimestre" },
  semestral: { rotulo: "semestral", dias: 180, sufixo: "/semestre" },
  anual: { rotulo: "anual", dias: 365, sufixo: "/ano" },
  vitalicio: { rotulo: "vitalício", dias: 3650, sufixo: " uma vez" },
} as const;

export type Plano = keyof typeof PLANOS;

/** Traduz o texto que vem da Kirvano para um plano conhecido. */
export function normalizarPlano(texto: string | null | undefined): Plano {
  const t = (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!t) return "mensal";
  if (/vitalic|lifetime|unic|one[- ]?time/.test(t)) return "vitalicio";
  if (/anual|annual|yearly|ano|12\s*(meses|m)|year/.test(t)) return "anual";
  if (/semestr|6\s*(meses|m)|half/.test(t)) return "semestral";
  if (/trimestr|quarter|3\s*(meses|m)/.test(t)) return "trimestral";
  if (/bimestr|2\s*(meses|m)/.test(t)) return "bimestral";
  if (/quinzen|15\s*dias|biweek|fortnight/.test(t)) return "quinzenal";
  if (/semanal|weekly|week|7\s*dias/.test(t)) return "semanal";
  return "mensal";
}

/** Dias de um ciclo do plano (referência da renovação e do anel). */
export function diasDoPlano(plano: string | null | undefined): number {
  return PLANOS[normalizarPlano(plano)].dias;
}

/** Nome amigável do plano. */
export function rotuloPlano(plano: string | null | undefined): string {
  return PLANOS[normalizarPlano(plano)].rotulo;
}

/** Sufixo do preço: /mês, /ano, /semestre… */
export function sufixoPreco(plano: string | null | undefined): string {
  return PLANOS[normalizarPlano(plano)].sufixo;
}

export type EstadoAssinatura = {
  status: string;
  plano: string;
  valor: number;
  venceEm: string;
  /** duração do ciclo do plano, em dias */
  cicloDias: number;
  /** dias inteiros de atraso (0 quando em dia) */
  atraso: number;
  /** dias que ainda faltam para o bloqueio (0 quando já bloqueou) */
  restam: number;
  bloqueado: boolean;
  emDia: boolean;
  /** e-mail que comprou na Kirvano (quando já houve compra) */
  email: string | null;
  /** último evento recebido da Kirvano */
  ultimoEvento: string | null;
  /** quando a Kirvano confirmou algo por último */
  confirmadoEm: string | null;
  /** primeiro mês quitado */
  primeiroPagoEm: string | null;
};

export function calcular(
  status: string,
  plano: string,
  valor: number,
  venceEm: string,
  extra: Partial<
    Pick<EstadoAssinatura, "email" | "ultimoEvento" | "confirmadoEm" | "primeiroPagoEm">
  > = {},
): EstadoAssinatura {
  const dia = 86_400_000;
  const diff = Date.now() - new Date(venceEm).getTime();
  const atraso = Math.max(0, Math.floor(diff / dia));
  const cancelada = status === "canceled";
  const bloqueado = cancelada || atraso >= CARENCIA_DIAS;
  return {
    status,
    plano,
    valor,
    venceEm,
    cicloDias: diasDoPlano(plano),
    atraso,
    restam: Math.max(0, CARENCIA_DIAS - atraso),
    bloqueado,
    emDia: !cancelada && atraso === 0,
    email: extra.email ?? null,
    ultimoEvento: extra.ultimoEvento ?? null,
    confirmadoEm: extra.confirmadoEm ?? null,
    primeiroPagoEm: extra.primeiroPagoEm ?? null,
  };
}

/** Dias que faltam para o próximo vencimento (só quando está em dia). */
export function diasAteVencer(venceEm: string) {
  return Math.max(0, Math.ceil((new Date(venceEm).getTime() - Date.now()) / 86_400_000));
}

/** Link de pagamento já com os dados de quem vai pagar. */
export function linkPagamento(
  base: string,
  dados: { email?: string | null; nome?: string | null; telefone?: string | null } = {},
) {
  if (!base) return "";
  const q = new URLSearchParams();
  if (dados.email) q.set("email", dados.email);
  if (dados.nome) q.set("name", dados.nome);
  if (dados.telefone) q.set("phone", dados.telefone.replace(/\D/g, ""));
  const query = q.toString();
  if (!query) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
}

/**
 * Lê plano e valor do aviso da Kirvano. O nome da oferta/plano manda; o valor
 * vem em texto ("R$ 399,00"), então precisa virar número antes de ser gravado.
 */
export function dadosDaCompra(payload: unknown): {
  plano: Plano;
  valor: number | null;
  proxima: string | null;
} {
  const c = (payload ?? {}) as Record<string, any>;
  const produto = Array.isArray(c["products"]) ? c["products"][0] : null;
  const texto = [
    c["plan"]?.name,
    c["plan"]?.charge_frequency,
    c["plan"]?.frequency,
    c["subscription"]?.plan?.name,
    c["subscription"]?.charge_frequency,
    c["offer"]?.name,
    produto?.offer_name,
    produto?.name,
    c["product_name"],
  ]
    .filter(Boolean)
    .join(" ");

  const bruto =
    c["total_price"] ?? c["payment"]?.total_price ?? produto?.price ?? c["price"] ?? null;
  let valor: number | null = null;
  if (typeof bruto === "number" && Number.isFinite(bruto)) valor = bruto;
  else if (typeof bruto === "string") {
    const n = Number(bruto.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) valor = n;
  }

  const data =
    c["subscription"]?.next_charge_date ?? c["next_charge_date"] ?? c["subscription"]?.charge_date;
  const proxima = data ? new Date(data as string).toISOString() : null;

  return { plano: normalizarPlano(texto), valor, proxima };
}

/** Nome amigável dos eventos que a Kirvano manda. */
export function rotuloEvento(evento: string) {
  const mapa: Record<string, string> = {
    SALE_APPROVED: "Pagamento aprovado",
    SUBSCRIPTION_APPROVED: "Assinatura aprovada",
    SUBSCRIPTION_RENEWED: "Assinatura renovada",
    SUBSCRIPTION_LATE: "Pagamento atrasado",
    SALE_REFUSED: "Pagamento recusado",
    ABANDONED_CART: "Pagamento não concluído",
    SALE_REFUNDED: "Reembolso",
    SALE_CHARGEBACK: "Contestação no cartão",
    SUBSCRIPTION_CANCELED: "Assinatura cancelada",
    SUBSCRIPTION_CANCELLED: "Assinatura cancelada",
    SUBSCRIPTION_EXPIRED: "Assinatura expirada",
  };
  return mapa[evento] ?? evento.replaceAll("_", " ").toLowerCase();
}
