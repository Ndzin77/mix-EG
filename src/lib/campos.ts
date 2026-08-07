/** Máscaras e validações de campo — o aviso aparece na hora, embaixo do campo,
 *  em vez de deixar salvar errado. */

export const somenteDigitos = (v: string) => v.replace(/\D/g, "");

/** Inteiro positivo com teto (mesas, minutos, tamanho de fonte…). */
export function inteiro(v: string, max = 999): string {
  const d = somenteDigitos(v).replace(/^0+(?=\d)/, "");
  if (!d) return "";
  return String(Math.min(Number(d), max));
}

/** Dinheiro digitado à mão: só número com vírgula, nunca negativo. */
export function moeda(v: string): string {
  let s = v.replace(/[^\d.,]/g, "").replace(/\./g, ",");
  const partes = s.split(",");
  if (partes.length > 2) s = `${partes[0]},${partes.slice(1).join("")}`;
  const [int = "", dec] = s.split(",");
  return dec === undefined ? int : `${int},${dec.slice(0, 2)}`;
}

/** Texto de moeda → número. "1.2,50" nunca chega aqui por causa de `moeda`. */
export const numeroDeMoeda = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

/** (00) 00000-0000 conforme digita. */
export function telefone(v: string): string {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const telefoneValido = (v: string) => {
  const d = somenteDigitos(v);
  return d.length === 0 || d.length === 10 || d.length === 11;
};

/** 00.000.000/0000-00 conforme digita. */
export function cnpj(v: string): string {
  const d = somenteDigitos(v).slice(0, 14);
  let s = d.slice(0, 2);
  if (d.length > 2) s += `.${d.slice(2, 5)}`;
  if (d.length > 5) s += `.${d.slice(5, 8)}`;
  if (d.length > 8) s += `/${d.slice(8, 12)}`;
  if (d.length > 12) s += `-${d.slice(12)}`;
  return s;
}

/** Dígitos verificadores do CNPJ — evita salvar número inventado. */
export function cnpjValido(v: string): boolean {
  const d = somenteDigitos(v);
  if (d.length === 0) return true;
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string) => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(d.slice(0, 12)) === Number(d[12]) && calc(d.slice(0, 13)) === Number(d[13]);
}

/** Texto livre com teto de tamanho (nome, categoria, tags). */
export const texto = (v: string, max = 80) => v.slice(0, max);

/** Lista sem repetidos, ignorando maiúsculas/acentos de caixa. */
export const jaExiste = (lista: string[], valor: string) =>
  lista.some((c) => c.trim().toLowerCase() === valor.trim().toLowerCase());
