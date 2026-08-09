/**
 * Cadeado por seção. A dona liga o cadeado no Admin e escolhe uma senha só
 * para aquela tela. A senha nunca é guardada: fica só o resumo embaralhado
 * (SHA-256 com sal), do mesmo jeito que um banco guarda.
 *
 * Regra de segurança da casa: destravar vale **enquanto a tela está aberta**.
 * Trocou de menu e voltou, pede de novo — mesmo que ela tenha acabado de logar.
 */
export type Secao = "saidas" | "caixa" | "relatorios" | "admin";

export type Trava = { hash: string; salt: string };

export const secoes: { chave: Secao; rotulo: string }[] = [
  { chave: "saidas", rotulo: "Saídas" },
  { chave: "caixa", rotulo: "Caixa" },
  { chave: "relatorios", rotulo: "Relatórios" },
  { chave: "admin", rotulo: "Admin" },
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
