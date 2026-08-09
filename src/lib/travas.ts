/**
 * Cadeado por seção. A dona liga o cadeado no Admin e escolhe uma senha só
 * para aquela tela. A senha nunca é guardada: fica só o resumo embaralhado
 * (SHA-256 com sal), do mesmo jeito que um banco guarda.
 *
 * Regra de segurança da casa: destravar vale **enquanto a tela está aberta**.
 * Trocou de menu e voltou, pede de novo — mesmo que ela tenha acabado de logar.
 */
export type Secao = "saidas" | "caixa" | "relatorios" | "admin" | "assinatura";

export type Trava = { hash: string; salt: string };

export const secoes: { chave: Secao; rotulo: string }[] = [
  { chave: "saidas", rotulo: "Saídas" },
  { chave: "caixa", rotulo: "Caixa" },
  { chave: "relatorios", rotulo: "Relatórios" },
  { chave: "admin", rotulo: "Admin" },
  { chave: "assinatura", rotulo: "Assinatura" },
];

export function novoSal(): string {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return [...b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export async function resumoSenha(senha: string, sal: string): Promise<string> {
  const dados = new TextEncoder().encode(`${sal}:${senha}`);
  const bruto = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(bruto)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export async function senhaConfere(senha: string, trava: Trava): Promise<boolean> {
  return (await resumoSenha(senha, trava.salt)) === trava.hash;
}

export async function criarTrava(senha: string): Promise<Trava> {
  const salt = novoSal();
  return { salt, hash: await resumoSenha(senha, salt) };
}

/* ---------- regra única de senha ---------- */

/** Mínimo da casa: 4 caracteres, sem espaço nas pontas nem senha só de espaços. */
export const MIN_SENHA = 4;

/** Motivo em português quando a senha não serve — `null` quando serve. */
export function erroSenha(senha: string): string | null {
  if (senha !== senha.trim()) return "Sem espaço no começo ou no fim.";
  if (senha.length < MIN_SENHA) return `Faltam ${MIN_SENHA - senha.length} caractere(s).`;
  if (senha.length > 64) return "No máximo 64 caracteres.";
  return null;
}

export const senhaValida = (senha: string) => erroSenha(senha) === null;

/** 0 = inválida, 1 = fraca, 2 = boa, 3 = forte. Só para o medidor visual. */
export function forcaSenha(senha: string): 0 | 1 | 2 | 3 {
  if (!senhaValida(senha)) return 0;
  let pontos = 0;
  if (senha.length >= 6) pontos++;
  if (senha.length >= 10) pontos++;
  if (/[a-zA-Z]/.test(senha) && /\d/.test(senha)) pontos++;
  if (/[^a-zA-Z0-9]/.test(senha)) pontos++;
  return (Math.min(3, Math.max(1, pontos)) as 1 | 2 | 3);
}
