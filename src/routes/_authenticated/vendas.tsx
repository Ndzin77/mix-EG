import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronDown,
  Clock,
  CornerDownLeft,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MarcaDagua, ModoVitrine, TotemMarca } from "@/components/pdv/faixa-marca";
import { AppShell } from "@/components/app-shell";
import { CampoQtd } from "@/components/pdv/campo-qtd";
import { GradeProdutos } from "@/components/pdv/grade-produtos";
import { ModalCliente } from "@/components/pdv/modal-cliente";
import { ModalCobranca } from "@/components/pdv/modal-cobranca";
import { resumoCobranca, type CobrancaEstado } from "@/lib/cobranca";

import { PainelLateral } from "@/components/pdv/painel-lateral";
import {
  Foto,
  Realce,
  buscar,
  modoDoProduto,
  seloPreco,
  useContagem,
  type ComandaCard,
  type Linha,
  type Produto,
} from "@/components/pdv/comum";
import { ModalOpcao, ModalPreco, type PrecoResolvido } from "@/components/pdv/modal-preco";
import { useImagens } from "@/lib/imagens";
import { ModalRecibo } from "@/components/recibo/recibo";
import type { ReciboDados } from "@/lib/recibo";
import { brl, useConfig } from "@/lib/config";

import { cn } from "@/lib/utils";
import { listarProdutos } from "@/lib/loja.functions";
import type { PedidoInput } from "@/lib/vendas.functions";
import { enviar } from "@/lib/offline";
import { novoId } from "@/lib/fila-offline";
import { AvisoErro } from "@/components/aviso-erro";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — EG Mix Sorveteria e Confeitaria" },
      {
        name: "description",
        content:
          "Painel de vendas da EG Mix: registre pedidos, controle mesas e contas em aberto e feche o caixa do dia.",
      },
      { property: "og:title", content: "Vendas — EG Mix Sorveteria e Confeitaria" },
      {
        property: "og:description",
        content: "Registre pedidos, controle mesas em aberto e feche o caixa do dia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendasPage,
});

const cobrancaInicial: CobrancaEstado = {
  pagamento: "cash",
  desconto: 0,
  descontoAtivo: false,
  descontoModo: "reais",
  descontoEntrada: null,
  dividir: false,
  partes: [],
  parcial: null,
  recebido: null,
  trocoDoado: false,
};


function VendasPage() {
  const [loja] = useConfig();

  const queryClient = useQueryClient();
  const buscarProdutos = useServerFn(listarProdutos);

  const produtosQuery = useQuery({
    queryKey: ["produtos"],
    queryFn: () => buscarProdutos(),
  });

  const catalogo = useMemo<Produto[]>(
    () =>
      (produtosQuery.data ?? [])
        .filter((p) => p.active)
        .map((p) => ({
          id: p.id,
          cod: p.code ?? "",
          nome: p.name,
          detalhe: p.category ?? "",
          preco: Number(p.price),
          tags: p.tags ?? [],
          foto: p.image_url ?? null,
          modo: (p.pricing_mode ?? "fixed") as Produto["modo"],
          precoKg: Number(p.price_per_kg ?? 0),
          sabores: Array.isArray(p.variants)
            ? (
                p.variants as {
                  nome?: string;
                  preco?: number;
                  modo?: string;
                  precoKg?: number;
                }[]
              ).map((v) => ({
                nome: String(v?.nome ?? ""),
                preco: Number(v?.preco ?? 0),
                modo: (v?.modo === "manual" || v?.modo === "weight" ? v.modo : "fixed") as
                  | "fixed"
                  | "manual"
                  | "weight",
                precoKg: Number(v?.precoKg ?? 0),
              }))
            : [],
          opcoes: Array.isArray(p.opcoes) ? (p.opcoes as string[]) : [],
          opcoesMulti: p.opcoes_multi === true,
        })),
    [produtosQuery.data],
  );

  const rapidos = useMemo(() => catalogo.slice(0, 6), [catalogo]);
  const urlDe = useImagens(catalogo.map((p) => p.foto));

  const [carrinho, setCarrinho] = useState<Linha[]>([]);
  const [comandaAtiva, setComandaAtiva] = useState<{
    id: string;
    label: string;
    /** true = só somando itens numa conta que já existe */
    somando: boolean;
    jaNaConta: number;
  } | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [bump, setBump] = useState<string | null>(null);
  const [desfazer, setDesfazer] = useState<{ label: string; snapshot: Linha[] } | null>(null);
  const [cobranca, setCobranca] = useState<CobrancaEstado>(cobrancaInicial);
  const [recibo, setRecibo] = useState<ReciboDados | null>(null);
  const [fechada, setFechada] = useState<number | null>(null);

  /** produto esperando o preço (sabor, valor na hora ou peso) */
  const [precoDe, setPrecoDe] = useState<Produto | null>(null);
  /** produto esperando a escolha do sabor que não mexe no preço */
  const [opcaoDe, setOpcaoDe] = useState<Produto | null>(null);
  const [opcaoEscolhida, setOpcaoEscolhida] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [nomeando, setNomeando] = useState(false);
  /** faixa de atalhos recolhida: devolve altura para a grade e o carrinho */
  const [atalhosFixados, setAtalhosFixados] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const buscaRef = useRef<HTMLInputElement>(null);

  /* A escolha da dona fica lembrada no aparelho. */
  useEffect(() => {
    setAtalhosFixados(localStorage.getItem("pdv-atalhos") === "1");
  }, []);

  const alternarAtalhos = useCallback(() => {
    setAtalhosFixados((v) => {
      localStorage.setItem("pdv-atalhos", v ? "0" : "1");
      return !v;
    });
  }, []);

  const ajustarCobranca = useCallback(
    (patch: Partial<CobrancaEstado>) => setCobranca((c) => ({ ...c, ...patch })),
    [],
  );

  const resultados = useMemo(() => buscar(catalogo, termo), [catalogo, termo]);
  const buscando = termo.trim().length > 0;

  const total = useMemo(() => carrinho.reduce((s, i) => s + i.preco * i.qtd, 0), [carrinho]);
  const itens = useMemo(() => carrinho.reduce((s, i) => s + i.qtd, 0), [carrinho]);
  const totalAnimado = useContagem(total);

  const invalidar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["comandas"] });
    queryClient.invalidateQueries({ queryKey: ["caixa"] });
  }, [queryClient]);

  type RespostaPedido = { id: string; total: number; recibo: ReciboDados | null };

  /* Com internet grava direto; sem internet entra na fila do aparelho. */
  const mutacao = useMutation({
    mutationFn: ({ input, tmpId }: { input: PedidoInput; tmpId?: string }) =>
      enviar<RespostaPedido>(
        "pedido",
        input as unknown as Record<string, unknown>,
        input.status === "open" ? `a conta de ${input.label}` : `a venda de ${input.label}`,
        tmpId,
      ),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const mutacaoItens = useMutation({
    mutationFn: (input: { order_id: string; items: PedidoInput["items"] }) =>
      enviar<{ id: string }>(
        "itens",
        input as unknown as Record<string, unknown>,
        "os itens somados na conta",
        undefined,
        /* conta criada offline: o id só existe depois de subir */
        !input.order_id.includes("-") || input.order_id.length !== 36,
      ),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const gravando = mutacao.isPending || mutacaoItens.isPending;

  /** Preço fixo entra direto; os outros modos passam pelo modal de preço. */
  const lancar = useCallback((p: Produto, r?: PrecoResolvido) => {
    setCarrinho((atual) => {
      /* Só o preço fixo agrupa: duas pesagens diferentes são duas linhas. */
      if (!r || r.chave) {
        const uid = r?.chave ?? p.id;
        const existe = atual.find((l) => l.uid === uid);
        if (existe) return atual.map((l) => (l.uid === uid ? { ...l, qtd: l.qtd + 1 } : l));
        return [
          ...atual,
          { ...p, uid, qtd: 1, ...(r ? { preco: r.preco, rotulo: r.rotulo } : {}) },
        ];
      }
      return [
        ...atual,
        {
          ...p,
          uid: `${p.id}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
          preco: r.preco,
          rotulo: r.rotulo,
          qtd: r.qtd,
        },
      ];
    });
    setUltimo(p.id);
    setBump(p.id);
    setTermo("");
    setAtivo(0);
    buscaRef.current?.focus();
  }, []);

  const adicionar = useCallback(
    (p: Produto) => {
      if (p.opcoes?.length) {
        setOpcaoEscolhida(null);
        setOpcaoDe(p);
        return;
      }
      if (modoDoProduto(p) === "fixed") lancar(p);
      else setPrecoDe(p);
    },
    [lancar],
  );

  const alterar = (uid: string, delta: number) => {
    setBump(uid);
    setCarrinho((atual) =>
      atual.flatMap((l) =>
        l.uid === uid ? (l.qtd + delta <= 0 ? [] : [{ ...l, qtd: l.qtd + delta }]) : [l],
      ),
    );
  };

  const remover = (linha: Linha) => {
    setDesfazer({ label: `${linha.rotulo ?? linha.nome} removido`, snapshot: carrinho });
    setCarrinho((atual) => atual.filter((l) => l.uid !== linha.uid));
  };

  /** Quantidade digitada: zero (ou campo vazio) tira a linha, com desfazer. */
  const definirQtd = (linha: Linha, n: number) => {
    if (n <= 0) {
      remover(linha);
      return;
    }
    setBump(linha.uid);
    setCarrinho((atual) => atual.map((l) => (l.uid === linha.uid ? { ...l, qtd: n } : l)));
  };


  /** Soltar a conta é só desgrudar do nome — o que já foi selecionado fica. */
  const soltarConta = useCallback(() => {
    setComandaAtiva(null);
    setDestino(null);
    setNomeando(false);
    setCobrando(false);
    setCobranca(cobrancaInicial);
  }, []);

  /** Limpar de verdade: esvazia a tela, com desfazer de 6 segundos. */
  const limpar = useCallback(() => {
    setCarrinho((atual) => {
      if (atual.length) setDesfazer({ label: "Venda limpa", snapshot: atual });
      return [];
    });
    soltarConta();
  }, [soltarConta]);

  const linhasParaBanco = useCallback(
    (linhas: Linha[]) =>
      linhas.map((l) => ({
        product_id: l.id.includes("-") && l.id.length === 36 ? l.id : null,
        product_name: l.rotulo ?? l.nome,
        unit_price: l.preco,
        quantity: l.qtd,
      })),
    [],
  );

  /* Fechar precisa terminar em algo que se vê e se sente: varredura + selo. */
  const finalizar = useCallback(async () => {
    if (!carrinho.length || gravando) return;
    /* Mesma conta do modal: o que entrou é o que a venda vale. */
    const resumo = resumoCobranca(total, cobranca);
    const valor = resumo.cobrado;
    /* Recebeu menos que os produtos? vira desconto. Recebeu mais? acréscimo. */
    const desconto = Math.max(0, Math.round((total - valor) * 100) / 100);
    const partes = resumo.partes;
    const label = comandaAtiva?.label ?? destino ?? "Balcão";
    try {
      const envio = await mutacao.mutateAsync({
        input: {
          ...(comandaAtiva?.id ? { id: comandaAtiva.id } : {}),
          label,
          status: "paid",
          payment_method: partes[0]!.forma,
          discount: desconto,
          payments: partes.map((p) => ({ method: p.forma, amount: p.valor })),
          received: resumo.recebido,
          items: linhasParaBanco(carrinho),
        },
      });
      const snapshot = carrinho;
      setCarrinho([]);
      setComandaAtiva(null);
      setDestino(null);
      setNomeando(false);
      setCobrando(false);
      setCobranca(cobrancaInicial);
      setDesfazer(null);
      setFechada(valor);
      if (envio.offline) {
        /* Sem internet o recibo sai igual, montado com o que está na tela. */
        setRecibo({
          id: envio.opId,
          label,
          data: new Date().toISOString(),
          itens: snapshot.map((l) => ({
            nome: l.nome,
            qtd: l.qtd,
            unitario: l.preco,
            subtotal: Math.round(l.preco * l.qtd * 100) / 100,
          })),
          bruto: total,
          desconto,
          total: valor,
          pagamentos: partes.map((p) => ({ forma: p.forma, valor: p.valor })),
          recebido: resumo.recebido,
          troco: resumo.troco > 0.005 ? resumo.troco : null,
        });

        toast.warning("Sem internet: venda guardada no aparelho e recibo pronto para imprimir.");
      } else if (envio.resultado?.recibo) {
        setRecibo(envio.resultado.recibo);
      }
      buscaRef.current?.focus();
    } catch {
      /* erro já sinalizado no onError */
    }
  }, [carrinho, cobranca, comandaAtiva, destino, gravando, linhasParaBanco, mutacao, total]);

  /* Guardar a venda como comanda em aberto (cliente que paga depois). */
  const guardarComanda = useCallback(
    async (nome: string) => {
      const label = nome.trim() || "Cliente sem nome";
      if (!carrinho.length || gravando) return;
      const linhas = linhasParaBanco(carrinho);
      /* A tela não espera o banco: o pop-up fecha na hora e a gravação segue
         por baixo. Se falhar, os itens voltam para a tela. */
      const snapshot = carrinho;
      const contaAnterior = comandaAtiva;
      setCarrinho([]);
      setComandaAtiva(null);
      setDestino(null);
      setCobranca(cobrancaInicial);
      setNomeando(false);
      setNomeCliente("");
      setCobrando(false);
      buscaRef.current?.focus();
      try {
        if (comandaAtiva?.somando) {
          const envio = await mutacaoItens.mutateAsync({
            order_id: comandaAtiva.id,
            items: linhas,
          });
          if (envio.offline) {
            /* A conta na tela já mostra os itens; o banco recebe quando voltar. */
            queryClient.setQueryData<ComandaCard[]>(["comandas"], (atual) =>
              (atual ?? []).map((c) =>
                c.id === comandaAtiva.id ? { ...c, itens: [...c.itens, ...linhas] } : c,
              ),
            );
            toast.warning(`Sem internet: somado na conta de ${comandaAtiva.label} no aparelho.`);
          } else {
            toast.success(`Somado na conta de ${comandaAtiva.label}`);
          }
        } else {
          const tmpId = comandaAtiva?.id ?? novoId();
          const envio = await mutacao.mutateAsync({
            input: {
              ...(comandaAtiva?.id ? { id: comandaAtiva.id } : {}),
              label,
              status: "open",
              discount: 0,
              payments: [],
              items: linhas,
            },
            tmpId,
          });
          if (envio.offline) {
            queryClient.setQueryData<ComandaCard[]>(["comandas"], (atual) => [
              ...(atual ?? []).filter((c) => c.id !== tmpId),
              { id: tmpId, label, itens: linhas },
            ]);
            toast.warning(`Sem internet: conta de ${label} anotada no aparelho.`);
          } else {
            toast.success(`Anotado na conta de ${label}`);
          }
        }
      } catch {
        /* Deu erro na gravação: devolve o que estava na tela para não perder venda. */
        setCarrinho(snapshot);
        setComandaAtiva(contaAnterior);
      }
    },
    [carrinho, comandaAtiva, gravando, linhasParaBanco, mutacao, mutacaoItens, queryClient],
  );

  const anotar = useCallback(() => {
    const alvo = comandaAtiva?.label ?? destino;
    if (alvo) void guardarComanda(alvo);
    else setNomeando(true);
  }, [comandaAtiva, destino, guardarComanda]);

  const abrirComanda = useCallback((comanda: ComandaCard, receber: boolean) => {
    const jaNaConta = comanda.itens.reduce(
      (s, i) => s + Number(i.unit_price) * Number(i.quantity),
      0,
    );
    if (receber) {
      /* Receber: puxa a conta inteira para fechar de uma vez. */
      setCarrinho(
        comanda.itens.map((i, ix) => ({
          uid: i.id ?? `${comanda.id}-${ix}`,
          id: i.product_id ?? `${comanda.id}-${i.product_name}`,
          cod: "",
          nome: i.product_name,
          detalhe: "da conta",
          preco: Number(i.unit_price),
          tags: [],
          qtd: Number(i.quantity),
        })),
      );
    }
    /* Somar itens: o que já estava selecionado continua — é justamente o que a
       pessoa quer lançar nessa conta. Nada do que já foi gravado é reescrito. */
    setComandaAtiva({ id: comanda.id, label: comanda.label, somando: !receber, jaNaConta });
    setDestino(null);
    setNomeando(false);
    setCobranca(cobrancaInicial);
    setCobrando(receber);
    buscaRef.current?.focus();
  }, []);

  const escolherDestino = useCallback((label: string) => {
    setComandaAtiva(null);
    setDestino(label);
    setNomeando(false);
    buscaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (fechada === null) return;
    const t = setTimeout(() => setFechada(null), 1500);
    return () => clearTimeout(t);
  }, [fechada]);

  useEffect(() => {
    if (!desfazer) return;
    const t = setTimeout(() => setDesfazer(null), 6000);
    return () => clearTimeout(t);
  }, [desfazer]);

  useEffect(() => {
    if (!ultimo) return;
    const t = setTimeout(() => setUltimo(null), 900);
    return () => clearTimeout(t);
  }, [ultimo]);

  useEffect(() => {
    if (!bump) return;
    const t = setTimeout(() => setBump(null), 260);
    return () => clearTimeout(t);
  }, [bump]);

  /* Teclado é o caminho mais curto entre a intenção e o resultado. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Modal aberto manda no teclado: nada aqui atropela o que está na frente. */
      if (cobrando || nomeando) {
        if (e.key === "Escape") return;
      }
      const alvo = e.target as HTMLElement | null;
      const digitando =
        !!alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.tagName === "SELECT" ||
          alvo.isContentEditable);

      const enter = e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter";
      /* Cobrar: Ctrl/Cmd+Enter em qualquer lugar, ou Enter puro fora dos campos. */
      if (enter && !cobrando && !nomeando && (e.ctrlKey || e.metaKey || !digitando)) {
        e.preventDefault();
        if (carrinho.length) setCobrando(true);
        return;
      }
      if (digitando) return;
      if ((e.key === "a" || e.key === "A") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (carrinho.length) anotar();
        return;
      }
      const f = /^F([1-9])$/.exec(e.key);
      if (f) {
        const i = Number(f[1]) - 1;
        if (i < rapidos.length) {
          e.preventDefault();
          adicionar(rapidos[i]);
        }
        return;
      }
      if (e.key === "Escape") {
        if (cobrando || nomeando) return;
        e.preventDefault();
        if (termo) setTermo("");
        else limpar();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adicionar, anotar, limpar, termo, rapidos, carrinho.length, cobrando, nomeando]);

  const onBuscaKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!resultados.length) return;
      e.preventDefault();
      setAtivo((a) => (a + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      if (!resultados.length) return;
      e.preventDefault();
      setAtivo((a) => (a - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && resultados.length) {
      e.preventDefault();
      e.stopPropagation();
      adicionar(resultados[Math.min(ativo, resultados.length - 1)]);
    }
  };

  const alvoAtual = comandaAtiva?.label ?? destino;
  /* Só abre no clique: passar o mouse não abre mais sozinho. */
  const atalhosAbertos = atalhosFixados;

  return (
    <AppShell
      marca={<TotemMarca />}
      aside={
        <PainelLateral
          onAbrir={abrirComanda}
          onNovoDestino={escolherDestino}
          ativa={comandaAtiva?.id ?? null}
          destino={destino}
        />
      }
    >
      <ModoVitrine ativo={!cobrando && !nomeando && carrinho.length === 0} />


      {/* Âncora do fluxo: um único ponto de entrada, sempre no mesmo lugar. */}
      <div className="surface-deep relative z-20 shrink-0 border-b border-border bg-card px-5 pb-4 pt-5">
        <div className="relative z-30">
          <Search
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 transition-colors",
              buscando ? "text-primary" : "text-muted-foreground",
            )}
          />
          <input
            ref={buscaRef}
            type="text"
            autoFocus
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setAtivo(0);
            }}
            onKeyDown={onBuscaKey}
            placeholder="Digite produto, sabor ou código — os resultados aparecem aqui"
            aria-label="Buscar produto"
            className={cn(
              "h-14 w-full rounded-xl border-2 bg-secondary/30 pl-12 pr-28 text-lg font-medium outline-none",
              "transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-card",
              buscando ? "border-primary shadow-focus" : "border-border",
            )}
          />
          {termo ? (
            <button
              onClick={() => {
                setTermo("");
                buscaRef.current?.focus();
              }}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}

          {buscando ? (
            <div className="results-pop absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-xl border-2 border-primary/40 bg-card shadow-2xl">
              {resultados.length === 0 ? (
                <p className="px-4 py-5 text-sm text-muted-foreground">
                  Nada encontrado para “{termo}”. Tente o código ou parte do nome.
                </p>
              ) : (
                resultados.map((p, i) => (
                  <button
                    key={p.id}
                    onMouseEnter={() => setAtivo(i)}
                    onClick={() => adicionar(p)}
                    className={cn(
                      "flex w-full items-center gap-4 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0",
                      i === ativo ? "bg-primary-soft" : "hover:bg-secondary/40",
                    )}
                  >
                    <Foto produto={p} url={urlDe(p.foto)} className="size-11 shrink-0" />
                    <span className="money w-14 shrink-0 rounded-md bg-foreground/8 px-1.5 py-0.5 text-center text-base leading-6 text-muted-foreground">
                      <Realce texto={p.cod || "—"} termo={termo} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold leading-tight">
                        <Realce texto={p.nome} termo={termo} />
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[p.detalhe, p.tags.join(" · ")].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="money shrink-0 text-xl leading-none">
                      {seloPreco(p) ?? `R$ ${brl(p.preco)}`}
                    </span>
                    {i === ativo ? (
                      <CornerDownLeft className="size-4 shrink-0 text-primary" />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* Atalhos recolhidos: uma linha fina que abre num toque. */}
        <div
          className={cn("relative z-10 mt-3 transition-opacity", buscando && "opacity-40")}
        >
          <button
            type="button"
            onClick={alternarAtalhos}
            aria-expanded={atalhosAbertos}
            className="flex items-center gap-2 rounded-lg py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", atalhosAbertos && "rotate-180")}
            />
            <span className="eyebrow">Mais vendidos</span>
          </button>
          {produtosQuery.isError ? (
            <div className="mt-2">
              <AvisoErro erro={produtosQuery.error} aoTentar={() => produtosQuery.refetch()} />
            </div>
          ) : null}
          {!atalhosAbertos ? null : rapidos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              {produtosQuery.isError
                ? "Não consegui carregar os produtos — veja o aviso abaixo."
                : produtosQuery.isLoading
                  ? "Carregando produtos…"
                  : "Nenhum produto cadastrado ainda — cadastre no Admin para vender."}
            </p>
          ) : (
            <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {rapidos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => adicionar(p)}
                  title={`Atalho F${i + 1}`}
                  className={cn(
                    "tile press group relative flex flex-col overflow-hidden rounded-xl",
                    "border border-border bg-gradient-to-b from-card to-secondary/50 px-3 text-left",
                    "hover:border-primary hover:from-primary-soft hover:to-card hover:shadow-lg",
                    "h-19 justify-between py-3",
                  )}
                >
                  <Foto produto={p} url={urlDe(p.foto)} className="mb-1 size-9" />
                  <p className="line-clamp-2 text-sm font-bold leading-tight">{p.nome}</p>
                  <p className="money tile-price text-lg leading-none text-primary">
                    {seloPreco(p) ?? `R$ ${brl(p.preco)}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carrinho */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-5">
        {alvoAtual ? (
          <div
            className={cn(
              "flash-in sticky top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-2 px-4 py-3",
              comandaAtiva
                ? "glow-warning border-warning bg-warning-soft"
                : "border-primary bg-primary-soft shadow-lg",
            )}
          >
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-lg text-base font-black uppercase",
                comandaAtiva
                  ? "bg-warning text-warning-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {alvoAtual.trim().slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-black uppercase tracking-wide opacity-75">
                {comandaAtiva
                  ? comandaAtiva.somando
                    ? `Somando na conta · já tem R$ ${brl(comandaAtiva.jaNaConta)}`
                    : "Conta aberta · ainda não pagou"
                  : "Nova venda para"}
              </p>
              {comandaAtiva ? (
                <input
                  value={comandaAtiva.label}
                  onChange={(e) => setComandaAtiva({ ...comandaAtiva, label: e.target.value })}
                  aria-label="Nome do cliente desta conta"
                  className="w-full truncate border-none bg-transparent p-0 text-lg font-black leading-tight outline-none focus:underline"
                />
              ) : (
                <p className="truncate text-lg font-black leading-tight">{alvoAtual}</p>
              )}
            </div>
            <button
              onClick={soltarConta}
              title="Solta o nome da conta — os itens continuam na tela"
              className="press shrink-0 rounded-lg bg-card px-3 py-2 text-sm font-bold transition-colors hover:bg-accent"
            >
              Soltar
            </button>
          </div>
        ) : null}

        {carrinho.length === 0 ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <MarcaDagua />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <GradeProdutos
                catalogo={catalogo}
                carregando={produtosQuery.isLoading}
                onAdd={adicionar}
              />
            </div>
          </div>
        ) : (
          carrinho.map((item, i) => (
            <div
              key={item.uid}
              style={{ animationDelay: `${Math.min(i, 8) * 22}ms` }}
              className={cn(
                "rise-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border bg-card p-3 pl-4 shadow-sm",
                "transition-shadow hover:shadow-md",
                ultimo === item.id && "flash-in border-success",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Foto produto={item} url={urlDe(item.foto)} className="size-11 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight">
                    {item.rotulo ?? item.nome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[item.cod && `Cód. ${item.cod}`, item.detalhe, `R$ ${brl(item.preco)} un.`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:gap-6">
                <div className="flex items-center overflow-hidden rounded-lg border border-border bg-secondary/50">
                  <button
                    aria-label={`Menos um ${item.nome}`}
                    onClick={() => alterar(item.uid, -1)}
                    className="flex size-11 items-center justify-center transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Minus className="size-4" />
                  </button>
                  <CampoQtd
                    qtd={item.qtd}
                    nome={item.rotulo ?? item.nome}
                    destaque={bump === item.uid}
                    onDefinir={(n) => definirQtd(item, n)}
                  />

                  <button
                    aria-label={`Mais um ${item.nome}`}
                    onClick={() => alterar(item.uid, 1)}
                    className="flex size-11 items-center justify-center transition-colors hover:bg-success-soft hover:text-success"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="money min-w-[6rem] text-right text-2xl leading-none">
                  R$ {brl(item.preco * item.qtd)}
                </p>
                <button
                  aria-label={`Remover ${item.nome}`}
                  onClick={() => remover(item)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desfazer no lugar de confirmar: erro barato, fluxo intacto. */}
      {desfazer ? (
        <div className="shrink-0 px-5">
          <div className="rise-in flex items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft px-4 py-2.5">
            <p className="truncate text-sm font-semibold">{desfazer.label}</p>
            <button
              onClick={() => {
                setCarrinho(desfazer.snapshot);
                setDesfazer(null);
              }}
              className="press flex shrink-0 items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-bold transition-colors hover:bg-accent"
            >
              <Undo2 className="size-4" />
              Desfazer
            </button>
          </div>
        </div>
      ) : null}

      {/* Fechamento: total gigante + um único alvo grande no canto. */}
      <div className="relative shrink-0 overflow-hidden border-t border-border bg-secondary p-5">
        <div className="money-bar absolute inset-x-0 top-0 h-1" />
        {fechada !== null ? (
          <>
            <div className="sale-sweep pointer-events-none absolute inset-0 z-20 bg-success/25" />
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center px-4">
              <p className="stamp-in glow-success flex items-center gap-3 rounded-2xl border-4 border-success bg-card px-8 py-4 font-display text-3xl tracking-wider text-success sm:text-4xl">
                <Check className="size-9 shrink-0" strokeWidth={3} />
                Venda registrada · R$ {brl(fechada)}
              </p>
            </div>
          </>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="eyebrow text-foreground/60">
                {comandaAtiva?.somando ? "Somando nesta conta" : "Total da venda"}
              </span>
              <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-bold tabular-nums">
                {itens} {itens === 1 ? "item" : "itens"}
              </span>
              {carrinho.length ? (
                <button
                  onClick={limpar}
                  className="ml-auto flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-danger lg:ml-0"
                >
                  <RotateCcw className="size-3.5" />
                  Limpar <span className="kbd">Esc</span>
                </button>
              ) : null}
            </div>
            <p
              className={cn(
                "money text-4xl leading-none transition-colors",
                total > 0 ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              R$ <span className="text-7xl">{brl(totalAnimado)}</span>
            </p>
          </div>

          {/* Dois destinos possíveis do pedido: cobrar agora ou deixar na conta. */}
          <div className="grid gap-2">
            <button
              onClick={() => setCobrando(true)}
              disabled={!carrinho.length || gravando}
              className={cn(
                "press glow-primary flex min-h-[6.5rem] w-full flex-col items-center justify-center gap-1 rounded-2xl",
                "bg-primary px-10 font-display text-4xl tracking-wider text-primary-foreground",
                "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none lg:w-auto",
                carrinho.length ? "sheen-run" : "",
              )}
            >
              {comandaAtiva && !comandaAtiva.somando ? "Receber" : "Cobrar"}
              <span className="font-sans text-xs font-bold tracking-normal opacity-85">
                R$ {brl(total)}
              </span>
            </button>
            <button
              onClick={anotar}
              disabled={!carrinho.length || gravando}
              className={cn(
                "press flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border-2 border-warning",
                "bg-warning-soft px-6 text-base font-black uppercase tracking-wide text-warning-foreground",
                "hover:glow-warning disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              <Clock className="size-5" />
              {alvoAtual ? `Deixar na conta · ${alvoAtual}` : "Anotar (paga depois)"}
            </button>
          </div>
        </div>
      </div>

      {cobrando ? (
        <ModalCobranca
          bruto={total}
          alvo={alvoAtual}
          estado={cobranca}
          set={ajustarCobranca}
          pendente={gravando}
          onFechar={() => setCobrando(false)}
          onConfirmar={() => void finalizar()}
        />
      ) : null}

      {nomeando ? (
        <ModalCliente
          total={total}
          nome={nomeCliente}
          setNome={setNomeCliente}
          pendente={gravando}
          onFechar={() => setNomeando(false)}
          onConfirmar={(n) => void guardarComanda(n)}
        />
      ) : null}

      {opcaoDe ? (
        <ModalOpcao
          produto={opcaoDe}
          url={urlDe(opcaoDe.foto)}
          onFechar={() => setOpcaoDe(null)}
          onEscolher={(o) => {
            const p = opcaoDe;
            setOpcaoDe(null);
            if (modoDoProduto(p) === "fixed") {
              lancar(p, {
                preco: p.preco,
                rotulo: `${p.nome} — ${o}`,
                qtd: 1,
                chave: `${p.id}:${o}`,
              });
              return;
            }
            setOpcaoEscolhida(o);
            setPrecoDe(p);
          }}
        />
      ) : null}

      {precoDe ? (
        <ModalPreco
          produto={precoDe}
          url={urlDe(precoDe.foto)}
          onFechar={() => {
            setPrecoDe(null);
            setOpcaoEscolhida(null);
          }}
          onConfirmar={(r) => {
            lancar(precoDe, {
              ...r,
              rotulo: opcaoEscolhida ? `${r.rotulo} — ${opcaoEscolhida}` : r.rotulo,
            });
            setPrecoDe(null);
            setOpcaoEscolhida(null);
          }}
        />
      ) : null}

      {recibo ? <ModalRecibo dados={recibo} loja={loja} onFechar={() => setRecibo(null)} /> : null}
    </AppShell>
  );
}
