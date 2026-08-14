/**
 * Ponte entre a tela e o banco. Com internet, grava direto. Sem internet (ou se
 * a rede cai no meio), a operação entra na fila do aparelho e sobe sozinha
 * quando o sinal volta — sempre na ordem em que foi feita.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adicionarItens, salvarPedido } from "@/lib/vendas.functions";
import { salvarSaida } from "@/lib/saidas.functions";
import {
  assinarFila,
  carregarFila,
  ehFalhaDeRede,
  enfileirar,
  listarFila,
  novoId,
  removerDaFila,
  tamanhoFila,
  trocarTmpId,
  type Operacao,
  type TipoOperacao,
} from "@/lib/fila-offline";

type Carga = Record<string, unknown>;
type Executor = (carga: Carga) => Promise<{ id?: string } & Record<string, unknown>>;

let executores: Record<TipoOperacao, Executor> | null = null;
let drenando = false;

export function registrarExecutores(e: Record<TipoOperacao, Executor>) {
  executores = e;
}

export type Envio<T> = { offline: boolean; resultado: T | null; opId: string };

/**
 * Manda a operação para o banco ou para a fila. Devolve `offline: true` quando
 * ficou guardada — a tela deve seguir como se tivesse gravado.
 */
export async function enviar<T>(
  tipo: TipoOperacao,
  carga: Carga,
  rotulo: string,
  tmpId?: string,
  /** conta criada offline ainda sem id de verdade: precisa esperar na fila */
  forcarFila = false,
): Promise<Envio<T>> {
  const opId = novoId();
  const comChave = { ...carga, client_op_id: opId };
  const online = typeof navigator === "undefined" || navigator.onLine;

  if (!forcarFila && online && tamanhoFila() === 0 && executores) {

    try {
      /* Sinal ruim às vezes deixa o pedido pendurado: espera curta e vai para a fila. */
      const resultado = (await Promise.race([
        executores[tipo](comChave),
        new Promise((_, rejeitar) =>
          setTimeout(() => rejeitar(new Error("network timeout")), 4000),
        ),
      ])) as T;
      return { offline: false, resultado, opId };
    } catch (erro) {
      if (!ehFalhaDeRede(erro)) throw erro;
    }
  }

  const op: Operacao = { id: opId, tipo, carga: comChave, criadoEm: Date.now(), rotulo };
  if (tmpId) op.tmpId = tmpId;
  enfileirar(op);
  void drenarDepois();
  return { offline: true, resultado: null, opId };
}

async function drenarDepois() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  await drenar();
}

/** Sobe a fila em ordem. Recusa do banco tira o item e avisa; falta de sinal espera. */
export async function drenar(): Promise<{ subiram: number; falharam: number }> {
  if (drenando || !executores) return { subiram: 0, falharam: 0 };
  drenando = true;
  let subiram = 0;
  let falharam = 0;
  try {
    for (const op of [...listarFila()]) {
      try {
        const resposta = await executores[op.tipo](op.carga);
        if (op.tmpId && typeof resposta?.id === "string") trocarTmpId(op.tmpId, resposta.id);
        removerDaFila(op.id);
        subiram += 1;
      } catch (erro) {
        if (ehFalhaDeRede(erro)) break;
        removerDaFila(op.id);
        falharam += 1;
        toast.error(
          `Não deu para lançar ${op.rotulo}: ${erro instanceof Error ? erro.message : "recusado"}`,
        );
      }
    }
  } finally {
    drenando = false;
  }
  return { subiram, falharam };
}

/** Quantas operações estão esperando internet — para a faixa do topo. */
export function useFilaPendente() {
  return useSyncExternalStore(assinarFila, tamanhoFila, () => 0);
}

/**
 * Liga a fila ao servidor: registra como cada tipo de operação é gravada e
 * tenta subir o que está guardado ao abrir, ao voltar o sinal e ao focar a aba.
 */
export function useSincronizarOffline() {
  const queryClient = useQueryClient();
  const gravarPedido = useServerFn(salvarPedido);
  const somarItens = useServerFn(adicionarItens);
  const lancarSaida = useServerFn(salvarSaida);

  useEffect(() => {
    registrarExecutores({
      pedido: (carga) => gravarPedido({ data: carga as never }),
      itens: (carga) => somarItens({ data: carga as never }),
      saida: (carga) => lancarSaida({ data: carga as never }),
    });
  }, [gravarPedido, somarItens, lancarSaida]);

  const sincronizar = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const antes = tamanhoFila();
    if (!antes) return;
    const { subiram } = await drenar();
    if (subiram > 0) {
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      queryClient.invalidateQueries({ queryKey: ["caixa"] });
      queryClient.invalidateQueries({ queryKey: ["saidas"] });
      toast.success(
        subiram === 1 ? "1 lançamento sincronizado" : `${subiram} lançamentos sincronizados`,
      );
    }
  }, [queryClient]);

  useEffect(() => {
    void carregarFila().then(() => sincronizar());
    const aoVoltar = () => void sincronizar();
    window.addEventListener("online", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      window.removeEventListener("online", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [sincronizar]);
}
