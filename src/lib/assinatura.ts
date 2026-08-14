/**
 * Assinatura: regras que valem no servidor e no navegador.
 *
 * Fica fora do arquivo de server functions de propósito — lá só moram as
 * funções, para o empacotamento não deixar helper nenhum para trás.
 */

/** Tolerância da casa: sete dias depois do vencimento o acesso fecha. */
export const CARENCIA_DIAS = 7;

/** Único plano vendido nesta fase. A Kirvano confirma cada renovação mensal. */
export const PRECO_MENSAL = 39.9;

/** Página de pagamento do plano (Kirvano). */
export const PLANO_URL = "https://pay.kirvano.com/dba076f9-32d8-4e3e-b0ce-d6ec34c27877";

/**
 * Endereço principal que a Kirvano chama: a função `kirvano` publicada no
 * próprio Supabase. É curto (cabe no campo da Kirvano) e não depende de
 * domínio nenhum — trocar de domínio, usar vários ou publicar de novo nunca
 * quebra a cobrança. Quem protege é o cabeçalho `security-token`.
 */
export const WEBHOOK_URL_FUNCAO =
  "https://inrnuaqblqrwgvsvqgte.supabase.co/functions/v1/kirvano";

/**
 * Alternativa: chamada direta ao banco. Mesma lógica, porém longa — o
 * Supabase exige a chave pública colada na URL.
 */
export const WEBHOOK_URL_SUPABASE =
  "https://inrnuaqblqrwgvsvqgte.supabase.co/rest/v1/rpc/kirvano?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlucm51YXFibHFyd2d2c3ZxZ3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjY4OTIsImV4cCI6MjEwMTAwMjg5Mn0.pSd5ey2-fXDLtErMb0zSeZ1PHiVRfXc6vF1Vb1T0yiE";

/** Segunda entrada: mesma lógica, dentro do aplicativo. */
const PROJETO = "e5469dc6-8497-47a9-95ba-9361523d4dc3";
export const WEBHOOK_URL = `https://project--${PROJETO}.lovable.app/api/public/kirvano`;
/** Mesmo recebimento, apontando para a versão de testes (antes de publicar). */
export const WEBHOOK_URL_TESTE = `https://project--${PROJETO}-dev.lovable.app/api/public/kirvano`;



/** Eventos que a loja precisa marcar no painel da Kirvano. */
export const EVENTOS_KIRVANO = [
  "Compra aprovada",
  "Assinatura renovada",
  "Assinatura atrasada",
  "Assinatura cancelada",
  "Reembolso / chargeback",
] as const;

/**
 * Planos aceitos. Quem manda é a Kirvano: o nome da oferta vira um destes,
 * e a duração do ciclo passa a valer para a data e para o anel da tela.
 * Vender uma oferta nova (anual, semestral…) não pede mexer no código.
 */
export const PLANOS = { mensal: { rotulo: "mensal", dias: 30, sufixo: "/mês" } } as const;

export type Plano = keyof typeof PLANOS;

/** Traduz o texto que vem da Kirvano para um plano conhecido. */
export function normalizarPlano(texto: string | null | undefined): Plano {
  void texto;
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
  /** só é verdadeiro depois de uma confirmação de pagamento da Kirvano */
  pago: boolean;
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
  const evento = (extra.ultimoEvento ?? "").toUpperCase();
  const pago = ["SALE_APPROVED", "SUBSCRIPTION_APPROVED", "SUBSCRIPTION_RENEWED"].includes(evento);
  const dia = 86_400_000;
  const diff = Date.now() - new Date(venceEm).getTime();
  const atraso = Math.max(0, Math.floor(diff / dia));
  const cancelada = status === "canceled";
  const bloqueado = !pago || cancelada || atraso >= CARENCIA_DIAS;
  return {
    status,
    plano,
    valor,
    venceEm,
    cicloDias: diasDoPlano(plano),
    atraso,
    restam: Math.max(0, CARENCIA_DIAS - atraso),
    bloqueado,
    emDia: pago && !cancelada && atraso === 0,
    pago,
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

  const bruto =
    c["total_price"] ?? c["payment"]?.total_price ?? produto?.price ?? c["price"] ?? null;
  let valor: number | null = null;
  if (typeof bruto === "number" && Number.isFinite(bruto)) valor = bruto;
  else if (typeof bruto === "string") {
    const n = Number(bruto.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) valor = n;
  }

  /* A Kirvano manda a data em "2026-09-12 15:03:51" (sem T e sem fuso), que
     `new Date` recusa em alguns runtimes. Normalizamos antes de converter. */
  const data =
    c["plan"]?.next_charge_date ??
    c["subscription"]?.next_charge_date ??
    c["next_charge_date"] ??
    c["subscription"]?.charge_date ??
    null;
  let proxima: string | null = null;
  if (typeof data === "string" && data.trim()) {
    const texto = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(data.trim())
      ? `${data.trim().replace(" ", "T")}-03:00`
      : data.trim();
    const d = new Date(texto);
    if (!Number.isNaN(d.getTime())) proxima = d.toISOString();
  }

  return { plano: "mensal", valor, proxima };
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
