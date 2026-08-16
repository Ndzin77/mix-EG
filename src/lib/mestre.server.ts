/**
 * Modo mestre: o painel do dono da plataforma.
 *
 * A combinação secreta NUNCA vive no navegador — a conferência acontece aqui,
 * contra segredos do projeto, e o que volta é só um cookie assinado. Assim
 * ninguém descobre a senha lendo o código da página.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

export type SessaoMestre = { mestre?: boolean; desde?: number };

/* Config montada por chamada: em runtime de borda as variáveis chegam por
   requisição, então ler no topo do arquivo devolveria vazio. */
export function configSessao() {
  return {
    password: process.env["SESSION_SECRET"] ?? "",
    name: "gestor-mestre",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

/** Comparação que não entrega a resposta pelo tempo de resposta. */
function igual(a: string, b: string) {
  const x = createHash("sha256").update(a, "utf8").digest();
  const y = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(x, y);
}

/* Teclado de celular gosta de acrescentar aspas e espaço no começo/fim.
   Isso não faz parte da senha — limpo antes de comparar. */
function limpar(v: string) {
  return v.trim().replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "");
}

/** Diz se o servidor onde o app está rodando conhece a combinação mestra.
 *  Em hospedagem própria (Vercel etc.) as variáveis precisam ser cadastradas lá. */
export function segredosFaltando() {
  return (["MESTRE_EMAIL", "MESTRE_SENHA", "SESSION_SECRET"] as const).filter(
    (chave) => !(process.env[chave] ?? "").trim(),
  );
}

export function credenciaisConferem(email: string, senha: string) {
  const e = process.env["MESTRE_EMAIL"] ?? "";
  const s = process.env["MESTRE_SENHA"] ?? "";
  if (!e || !s) return false;
  return igual(limpar(email).toLowerCase(), limpar(e).toLowerCase()) && igual(limpar(senha), limpar(s));
}

/** Porteiro de toda ação do painel. Sem cookie válido, nada acontece. */
export async function exigirMestre() {
  const sessao = await useSession<SessaoMestre>(configSessao());
  if (!sessao.data.mestre) throw new Error("Acesso restrito.");
  return sessao;
}

export type LojaMestre = {
  tenantId: string;
  loja: string;
  email: string | null;
  nome: string | null;
  status: string;
  plano: string;
  preco: number;
  venceEm: string | null;
  ultimoEvento: string | null;
  criadaEm: string | null;
  /* Sinais de vida da loja — alimentam ordenação e diagnóstico rápido. */
  ultimaVenda: string | null;
  produtosAtivos: number;
  anotacao: string | null;
};

/** Raio-X: o retrato da loja sem precisar entrar na conta dela. */
export type RaioX = {
  produtosAtivos: number;
  produtosInativos: number;
  produtosComFoto: number;
  vendasHoje: number;
  faturouHoje: number;
  vendas7: number;
  faturou7: number;
  vendas30: number;
  faturou30: number;
  ticketMedio30: number;
  contasAbertas: number;
  saidasMes: number;
  ultimaVenda: string | null;
  usuarios: number;
  emailConfirmado: boolean;
  ultimoLogin: string | null;
  criadaEm: string | null;
  veredito: { cor: "success" | "warning" | "danger"; titulo: string; texto: string };
};
