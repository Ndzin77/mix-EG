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

export type EstadoAssinatura = {
  status: string;
  plano: string;
  valor: number;
  venceEm: string;
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
