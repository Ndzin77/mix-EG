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

export function credenciaisConferem(email: string, senha: string) {
  const e = process.env["MESTRE_EMAIL"] ?? "";
  const s = process.env["MESTRE_SENHA"] ?? "";
  if (!e || !s) return false;
  return igual(email.trim().toLowerCase(), e.trim().toLowerCase()) && igual(senha, s);
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
};
