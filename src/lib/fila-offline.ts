/**
 * Fila de operações feitas sem internet. Cada gravação do caixa (abrir conta,
 * somar itens, fechar venda, lançar saída) entra aqui antes de ir para o banco.
 * Guardada no próprio aparelho (IndexedDB), então fechar o navegador ou ficar
 * sem sinal não perde movimento.
 */
import { get, set } from "idb-keyval";

export type TipoOperacao = "pedido" | "itens" | "saida";

export type Operacao = {
  /** número da operação gerado no aparelho: o banco usa para não duplicar */
  id: string;
  tipo: TipoOperacao;
  carga: Record<string, unknown>;
  criadoEm: number;
  /** id provisório da comanda criada offline, para religar os itens depois */
  tmpId?: string;
  /** descrição curta para o aviso quando o banco recusa */
  rotulo: string;
};

const CHAVE = "egmix.fila.v1";

let fila: Operacao[] = [];
let carregada = false;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((fn) => fn());
}

function gravar() {
  void set(CHAVE, fila).catch(() => {
    /* sem IndexedDB (modo privado): a fila segue só em memória */
  });
}

/** Lê a fila guardada no aparelho. Chamado uma vez, depois do carregamento. */
export async function carregarFila() {
  if (carregada) return fila;
  carregada = true;
  try {
    const guardada = await get<Operacao[]>(CHAVE);
    if (guardada?.length) {
      fila = guardada;
      avisar();
    }
  } catch {
    /* fila corrompida não pode derrubar o caixa */
  }
  return fila;
}

export function novoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listarFila() {
  return fila;
}

export function tamanhoFila() {
  return fila.length;
}

export function enfileirar(op: Operacao) {
  fila = [...fila, op];
  gravar();
  avisar();
}

export function removerDaFila(id: string) {
  fila = fila.filter((o) => o.id !== id);
  gravar();
  avisar();
}

/** Comanda criada offline recebeu o id de verdade: religa quem esperava por ela. */
export function trocarTmpId(tmpId: string, idReal: string) {
  let mudou = false;
  fila = fila.map((o) => {
    if (o.carga["order_id"] === tmpId || o.carga["id"] === tmpId) {
      mudou = true;
      const carga = { ...o.carga };
      if (carga["order_id"] === tmpId) carga["order_id"] = idReal;
      if (carga["id"] === tmpId) carga["id"] = idReal;
      return { ...o, carga };
    }
    return o;
  });
  if (mudou) {
    gravar();
    avisar();
  }
}

export function assinarFila(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Falha de rede (ficou sem sinal no meio) x recusa do banco (regra de negócio). */
export function ehFalhaDeRede(erro: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /failed to fetch|networkerror|load failed|network request failed|timeout|ecconnreset/i.test(
    msg,
  );
}
