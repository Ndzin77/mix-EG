import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ChefHat,
  ChevronDown,
  Clock,

  IceCream,
  ImagePlus,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Printer,
  Scale,
  Store,
  Tag,
  Tags,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { TravaSecao } from "@/components/trava-secao";
import { Modal } from "@/components/modal";
import { useConfirmar } from "@/components/confirmar";
import { UploadImagem } from "@/components/upload-imagem";
import { CartaoRecibo } from "@/components/admin/cartao-recibo";
import { CartaoSeguranca } from "@/components/admin/cartao-seguranca";

import { CartaoInstalar } from "@/components/instalar-app";
import { CartaoMarca } from "@/components/admin/cartao-marca";
import { CartaoBancada } from "@/components/admin/cartao-bancada";
import { moeda, telefone as mascaraTelefone, telefoneValido, texto } from "@/lib/campos";

import { brl, urgencia, useConfig } from "@/lib/config";
import { useImagens } from "@/lib/imagens";
import {
  excluirProduto,
  listarProdutos,
  obterLoja,
  renomearCategoria,
  salvarLoja,
  salvarProduto,
} from "@/lib/loja.functions";
import type { ModoPreco } from "@/components/pdv/comum";
import { cn } from "@/lib/utils";
import { AvisoErro } from "@/components/aviso-erro";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — EG Mix Sorveteria e Confeitaria" },
      {
        name: "description",
        content:
          "Cadastro de produtos com foto, dados e logo da loja, categorias de saída, cronômetro das comandas e meta do dia.",
      },
      { property: "og:title", content: "Admin — EG Mix Sorveteria e Confeitaria" },
      {
        property: "og:description",
        content:
          "Produtos com foto, logo da loja, categorias de saída personalizadas e tempos das comandas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const exemplos = [3, 10, 20];

/** Sabor enquanto está sendo digitado: os valores ficam como texto para a
 *  vírgula não sumir a cada tecla. Viram número só na hora de salvar. */
type SaborRascunho = {
  nome: string;
  preco: string;
  modo: Exclude<ModoPreco, "flavor">;
  precoKg: string;
};

type Rascunho = {
  id?: string;
  name: string;
  code: string;
  category: string;
  tags: string;
  price: string;
  active: boolean;
  image_url: string;
  modo: ModoPreco;
  precoKg: string;
  sabores: SaborRascunho[];
  /** sabores que não mudam o preço: só escolha na hora da venda */
  opcoes: string[];
  /** deixa o caixa marcar vários desses sabores na mesma venda */
  opcoesMulti: boolean;
};

const rascunhoVazio: Rascunho = {
  name: "",
  code: "",
  category: "",
  tags: "",
  price: "",
  active: true,
  image_url: "",
  modo: "fixed",
  precoKg: "",
  sabores: [],
  opcoes: [],
  opcoesMulti: false,
};

/** As quatro formas de o preço nascer, explicadas em uma frase cada. */
const modosPreco: { valor: ModoPreco; titulo: string; frase: string; icone: typeof Tag }[] = [
  {
    valor: "fixed",
    titulo: "Preço fixo",
    frase: "Sempre o mesmo valor.",
    icone: Tag,
  },
  {
    valor: "flavor",
    titulo: "Preço por sabor",
    frase: "Cada sabor tem seu preço.",
    icone: IceCream,
  },
  {
    valor: "manual",
    titulo: "Preço na hora",
    frase: "O caixa digita o valor.",
    icone: Pencil,
  },
  {
    valor: "weight",
    titulo: "Vendido por peso",
    frase: "Preço do quilo × gramas.",
    icone: Scale,
  },
];

/* Uma decisão por vez: quatro assuntos, um visível de cada vez. Rolagem
   infinita cansa e esconde; aba escolhida some o resto. */
type Aba = "cardapio" | "loja" | "recibo" | "seguranca";

const abas: { valor: Aba; titulo: string; icone: typeof Tag }[] = [
  { valor: "cardapio", titulo: "Cardápio", icone: IceCream },
  { valor: "loja", titulo: "Loja", icone: Store },
  { valor: "recibo", titulo: "Recibo", icone: Printer },
  { valor: "seguranca", titulo: "Segurança", icone: Lock },
];

const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

/** Rótulos fixos da fita do cardápio. */
const TODAS = "Todos";
const SEM_CATEGORIA = "Sem categoria";

const campo =
  "mt-1.5 h-14 w-full rounded-xl border-2 border-border bg-secondary/30 px-4 text-base font-normal outline-none transition-colors focus:border-primary focus:bg-card";

function AdminPage() {
  const [config, setConfig] = useConfig();
  const confirmar = useConfirmar();
  const qc = useQueryClient();


  const fetchProdutos = useServerFn(listarProdutos);
  const fetchLoja = useServerFn(obterLoja);
  const mutProduto = useServerFn(salvarProduto);
  const mutExcluir = useServerFn(excluirProduto);
  const mutLoja = useServerFn(salvarLoja);

  const produtos = useQuery({ queryKey: ["produtos"], queryFn: () => fetchProdutos() });
  const loja = useQuery({ queryKey: ["loja"], queryFn: () => fetchLoja() });

  const lista = produtos.data ?? [];
  const urlDe = useImagens(lista.map((p) => p.image_url));
  const pastaProdutos = `${loja.data?.tenant_id ?? "sem-loja"}/produtos`;
  const pastaLogo = `${loja.data?.tenant_id ?? "sem-loja"}/logo`;

  /* Um modal por assunto: a página fica um painel de cartões, não um formulário
     rolante. Quem entra para mexer numa coisa não passa pelas outras cinco. */
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [aba, setAba] = useState<Aba>("cardapio");
  const [catAtiva, setCatAtiva] = useState<string>(TODAS);
  const [editandoLoja, setEditandoLoja] = useState(false);
  const [editandoTempos, setEditandoTempos] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  /* Categorias do cardápio: criar em qualquer lugar, gerenciar num lugar só. */
  const [criandoCategoria, setCriandoCategoria] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<{ de: string; para: string } | null>(null);

  const [dadosLoja, setDadosLoja] = useState({
    store_name: "",
    phone: "",
    address: "",
    receipt_footer: "",
  });

  useEffect(() => {
    if (loja.data) {
      setDadosLoja({
        store_name: loja.data.store_name ?? "",
        phone: loja.data.phone ?? "",
        address: loja.data.address ?? "",
        receipt_footer: loja.data.receipt_footer ?? "",
      });
    }
  }, [loja.data]);

  const salvar = useMutation({
    mutationFn: (r: Rascunho) =>
      mutProduto({
        data: {
          id: r.id,
          name: r.name.trim(),
          code: r.code.trim() || null,
          category: r.category.trim() || null,
          tags: r.tags
            .split(/[,\s]+/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
          price: r.modo === "fixed" || r.modo === "manual" ? num(r.price) : 0,
          active: r.active,
          image_url: r.image_url || null,
          pricing_mode: r.modo,
          price_per_kg: num(r.precoKg),
          variants: r.sabores
            .filter((v) => v.nome.trim())
            .map((v) => ({
              nome: v.nome.trim(),
              preco: v.modo === "weight" ? 0 : num(v.preco),
              modo: v.modo,
              precoKg: v.modo === "weight" ? num(v.precoKg) : 0,
            })),
          opcoes: r.opcoes.map((o) => o.trim()).filter(Boolean),
          opcoes_multi: r.opcoesMulti,
        },
      }),
    onSuccess: () => {
      toast.success("Produto salvo");
      setRascunho(null);
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (id: string) => mutExcluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renomear = useMutation({
    mutationFn: (v: { de: string; para: string }) => renomearCategoria({ data: v }),
    onSuccess: (_d, v) => {
      toast.success("Categoria renomeada");
      setRenomeando(null);
      setConfig({
        categoriasProduto: config.categoriasProduto.map((c) => (c === v.de ? v.para : c)),
      });
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gravarLoja = useMutation({
    mutationFn: () => mutLoja({ data: dadosLoja }),
    onSuccess: () => {
      toast.success("Dados da loja salvos");
      setEditandoLoja(false);
      qc.invalidateQueries({ queryKey: ["loja"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* Produtos agrupados: a lista deixa de ser um rolo único e vira cardápio. */
  const grupos = useMemo(() => {
    const mapa = new Map<string, typeof lista>();
    for (const p of lista) {
      const k = p.category?.trim() || "Sem categoria";
      mapa.set(k, [...(mapa.get(k) ?? []), p]);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [lista]);

  /* A lista real é a união do que foi cadastrado com o que os produtos já usam. */
  const categoriasCardapio = useMemo(() => {
    const set = new Set<string>(config.categoriasProduto);
    for (const p of lista) if (p.category?.trim()) set.add(p.category.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [config.categoriasProduto, lista]);

  /* Fita de categorias: "Todos" primeiro (posição serial), depois as reais e,
     por último, "Sem categoria" — só quando existir produto solto. */
  const fitaCategorias = useMemo(() => {
    const contar = (c: string) =>
      lista.filter((p) => (p.category?.trim() || SEM_CATEGORIA) === c).length;
    const base = [
      { nome: TODAS, qtd: lista.length },
      ...categoriasCardapio.map((c) => ({ nome: c, qtd: contar(c) })),
    ];
    const soltos = contar(SEM_CATEGORIA);
    if (soltos) base.push({ nome: SEM_CATEGORIA, qtd: soltos });
    return base;
  }, [lista, categoriasCardapio]);

  /* Uma categoria por vez: menos carga cognitiva que um rolo com tudo. */
  const gruposVisiveis = useMemo(
    () => (catAtiva === TODAS ? grupos : grupos.filter(([g]) => g === catAtiva)),
    [grupos, catAtiva],
  );


  const criarCategoria = (nome: string): string | null => {
    const n = nome.trim();
    if (!n) return null;
    if (categoriasCardapio.some((c) => c.toLowerCase() === n.toLowerCase())) {
      toast.error("Essa categoria já existe");
      return null;
    }
    setConfig({ categoriasProduto: [...config.categoriasProduto, n] });
    return n;
  };

  const adicionarCategoria = () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    if (config.categoriasSaida.some((c) => c.toLowerCase() === nome.toLowerCase())) {
      setNovaCategoria("");
      return toast.error("Essa categoria já existe");
    }
    setConfig({ categoriasSaida: [...config.categoriasSaida, nome] });
    setNovaCategoria("");
  };

  return (
    <AppShell>
      <TravaSecao secao="admin" titulo="Admin">
      <PageHeader title="Admin" subtitle="Produtos, loja, categorias e comandas" />

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-4 pt-1">
        {abas.map((t) => {
          const ativa = aba === t.valor;
          return (
            <button
              key={t.valor}
              type="button"
              onClick={() => setAba(t.valor)}
              className={cn(
                "press relative flex h-14 shrink-0 items-center gap-2 rounded-t-xl px-4 text-sm font-bold transition-colors",
                ativa
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              <t.icone className="size-4" />
              {t.titulo}
              <span
                className={cn(
                  "absolute inset-x-2 bottom-0 h-1 rounded-t-full transition-transform",
                  ativa ? "scale-x-100 bg-primary" : "scale-x-0 bg-transparent",
                )}
              />
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24 md:p-5 md:pb-5">
        <div key={aba} className="animate-fade-in mx-auto max-w-5xl">
          {aba === "cardapio" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <span className="eyebrow text-primary">Cardápio</span>
                    <h2 className="mt-1 font-display text-2xl tracking-wide">
                      {lista.length} {lista.length === 1 ? "produto" : "produtos"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Toque num produto para editar nome, preço, foto e tags.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRascunho(rascunhoVazio)}
                    className="press flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-lg"
                  >
                    <Plus className="size-5" />
                    Novo produto
                  </button>
                </div>

                {/* Fita de categorias: uma do lado da outra, rolando na horizontal.
                    Alvo grande (Fitts), contagem pronta (sem contar com o olho) e
                    máscara nas pontas avisando que há mais para o lado. */}
                {lista.length ? (
                  <div className="fita-fade -mx-1 mt-4">
                    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2">
                      {fitaCategorias.map((c) => {
                        const ativa = catAtiva === c.nome;
                        return (
                          <button
                            key={c.nome}
                            type="button"
                            onClick={() => setCatAtiva(c.nome)}
                            aria-pressed={ativa}
                            className={cn(
                              "press flex h-12 shrink-0 snap-start items-center gap-2 rounded-xl border-2 px-4 text-sm font-black uppercase tracking-wide transition-colors",
                              ativa
                                ? "border-primary bg-primary text-primary-foreground shadow-lg"
                                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                            )}
                          >
                            <span className="max-w-44 truncate">{c.nome}</span>
                            <span
                              className={cn(
                                "grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[0.6875rem] tabular-nums",
                                ativa ? "bg-primary-foreground/20" : "bg-secondary",
                              )}
                            >
                              {c.qtd}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {produtos.isError ? (
                  <div className="mt-6">
                    <AvisoErro erro={produtos.error} aoTentar={() => produtos.refetch()} />
                  </div>
                ) : produtos.isLoading ? (
                  <div className="mt-6 space-y-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-foreground/8" />
                    ))}
                  </div>
                ) : lista.length === 0 ? (
                  <div className="mt-6 rounded-xl border-2 border-dashed border-border p-8 text-center">
                    <p className="font-display text-2xl tracking-wide">Cardápio vazio</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cadastre o primeiro sabor — com foto, ele já aparece bonito na tela de
                      vendas.
                    </p>
                  </div>
                ) : gruposVisiveis.length === 0 ? (
                  <div className="mt-6 rounded-xl border-2 border-dashed border-border p-8 text-center">
                    <p className="font-display text-2xl tracking-wide">Nenhum produto aqui</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A categoria “{catAtiva}” ainda está vazia.
                    </p>
                    <button
                      type="button"
                      onClick={() => setRascunho({ ...rascunhoVazio, category: catAtiva })}
                      className="press mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-lg"
                    >
                      <Plus className="size-5" />
                      Cadastrar nesta categoria
                    </button>
                  </div>
                ) : (
                  <div key={catAtiva} className="animate-fade-in mt-5 space-y-5">
                    {gruposVisiveis.map(([grupo, itens]) => (

                      <div key={grupo}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="eyebrow text-muted-foreground">{grupo}</span>
                          <span className="h-px flex-1 bg-border" />
                          <span className="text-[0.6875rem] font-bold tabular-nums text-muted-foreground/70">
                            {itens.length}
                          </span>
                        </div>
                        <ul className="overflow-hidden rounded-xl border border-border">
                          {itens.map((p) => {
                            const foto = urlDe(p.image_url);
                            return (
                              <li
                                key={p.id}
                                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                              >
                                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary/60">
                                  {foto ? (
                                    <img src={foto} alt="" className="size-full object-cover" />
                                  ) : (
                                    <IceCream className="size-5 text-muted-foreground" />
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-bold leading-tight">
                                    {p.name}
                                    {p.active ? null : (
                                      <span className="ml-2 rounded bg-foreground/8 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                        inativo
                                      </span>
                                    )}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {[p.code && `Cód. ${p.code}`, (p.tags ?? []).join(" · ")]
                                      .filter(Boolean)
                                      .join(" · ") || "sem tags"}
                                  </span>
                                </span>
                                <span className="money shrink-0 text-xl leading-none">
                                  R$ {brl(Number(p.price))}
                                </span>
                                <span className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    aria-label={`Editar ${p.name}`}
                                    onClick={() =>
                                      setRascunho({
                                        id: p.id,
                                        name: p.name,
                                        code: p.code ?? "",
                                        category: p.category ?? "",
                                        tags: (p.tags ?? []).join(", "),
                                        price: String(p.price),
                                        active: p.active,
                                        image_url: p.image_url ?? "",
                                        modo: (p.pricing_mode ?? "fixed") as ModoPreco,
                                        precoKg: String(p.price_per_kg ?? 0),
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
                                              preco: v?.preco ? brl(Number(v.preco)) : "",
                                              modo: (v?.modo === "manual" || v?.modo === "weight"
                                                ? v.modo
                                                : "fixed") as Exclude<ModoPreco, "flavor">,
                                              precoKg: v?.precoKg ? brl(Number(v.precoKg)) : "",
                                            }))
                                          : [],
                                        opcoesMulti: p.opcoes_multi === true,
                                        opcoes: Array.isArray(p.opcoes)
                                          ? (p.opcoes as string[])
                                          : [],
                                      })
                                    }
                                    className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                                  >
                                    <Pencil className="size-5" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Excluir ${p.name}`}
                                    onClick={async () => {
                                      const ok = await confirmar({
                                        titulo: `Excluir ${p.name}?`,
                                        descricao:
                                          "O produto sai do cardápio de vendas. As vendas já feitas continuam no histórico.",
                                      });
                                      if (ok) remover.mutate(p.id);
                                    }}
                                    className="grid size-11 place-items-center rounded-lg text-danger hover:bg-danger-soft"
                                  >
                                    <Trash2 className="size-5" />
                                  </button>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Gestão recolhida: não compete com o cadastro, mas fica à mão. */}
              <details className="group h-fit rounded-2xl border border-border bg-card p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2">
                  <Tags className="size-4 text-muted-foreground" />
                  <span className="eyebrow flex-1 text-muted-foreground">
                    Gerenciar categorias
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-1 text-xs text-muted-foreground">
                  Criar, renomear e remover — organizam as abas da tela de vendas.
                </p>
                {/* Fita: uma categoria do lado da outra, rolando na horizontal —
                    a lista deixa de crescer para baixo e o olho varre numa linha. */}
                <ul className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                  {categoriasCardapio.length === 0 ? (
                    <li className="text-xs text-muted-foreground">
                      Nenhuma categoria — os produtos ficam em “Sem categoria”.
                    </li>
                  ) : null}
                  {categoriasCardapio.map((c) => {
                    const usados = lista.filter((p) => (p.category?.trim() || "") === c).length;
                    return (
                      <li
                        key={c}
                        className="flex shrink-0 snap-start items-center gap-2 rounded-xl border border-border bg-secondary/30 py-2 pl-3 pr-2"
                      >
                        <span className="max-w-40 truncate text-sm font-bold">{c}</span>
                        <span className="shrink-0 text-[0.6875rem] font-bold tabular-nums text-muted-foreground/70">
                          {usados}
                        </span>
                        <button
                          type="button"
                          aria-label={`Renomear categoria ${c}`}
                          onClick={() => setRenomeando({ de: c, para: c })}
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-primary-soft hover:text-primary"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remover categoria ${c}`}
                          onClick={async () => {
                            const ok = await confirmar({
                              titulo: `Remover a categoria "${c}"?`,
                              descricao: usados
                                ? `${usados} produto(s) ficarão sem categoria.`
                                : "Ela some das abas da tela de vendas.",
                              confirmar: "Remover",
                            });
                            if (!ok) return;
                            setConfig({
                              categoriasProduto: config.categoriasProduto.filter((x) => x !== c),
                            });
                            if (usados) renomear.mutate({ de: c, para: "" });
                          }}
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => setCriandoCategoria("")}
                  className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border font-bold hover:border-primary"
                >
                  <Plus className="size-4" />
                  Nova categoria
                </button>
              </details>
            </div>
          ) : null}

          {aba === "loja" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Dados e logo da loja: um cartão-resumo que abre o formulário. */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
                  <Store className="size-4" />
                  Dados da loja
                </span>
                <p className="mt-2 truncate font-display text-xl tracking-wide">
                  {config.nomeLoja || "Sem nome"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[config.telefone, config.endereco].filter(Boolean).join(" · ") ||
                    "Telefone e endereço em branco"}
                </p>
                <button
                  type="button"
                  onClick={() => setEditandoLoja(true)}
                  className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border font-bold hover:border-primary"
                >
                  <ImagePlus className="size-4" />
                  Editar dados e logo
                </button>
              </section>

              {/* Categorias de saída: cada loja gasta com o que gasta. */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
                  <Tags className="size-4" />
                  Categorias de saída
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {config.categoriasSaida.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma categoria — as saídas serão lançadas soltas.
                    </p>
                  ) : null}
                  {config.categoriasSaida.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 py-2 pl-3 pr-2 text-sm font-bold"
                    >
                      {c}
                      <button
                        type="button"
                        aria-label={`Remover categoria ${c}`}
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: `Remover a categoria "${c}"?`,
                            descricao:
                              "Ela deixa de aparecer ao lançar saídas. Lançamentos antigos continuam com o nome dela.",
                            confirmar: "Remover",
                          });
                          if (!ok) return;
                          setConfig({
                            categoriasSaida: config.categoriasSaida.filter((x) => x !== c),
                          });
                        }}
                        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && adicionarCategoria()}
                    placeholder="Nova categoria"
                    aria-label="Nova categoria de saída"
                    className="h-12 min-w-0 flex-1 rounded-xl border-2 border-border bg-secondary/30 px-3 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={adicionarCategoria}
                    className="press grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
                    aria-label="Adicionar categoria"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>
              </section>

              <CartaoMarca />

              {/* Cronômetro: pode simplesmente não fazer sentido para a loja. */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-4" />
                  Cronômetro das comandas
                </span>
                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={config.cronometroAtivo}
                    onChange={(e) => setConfig({ cronometroAtivo: e.target.checked })}
                    className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm">
                    <span className="block font-bold">Marcar o tempo de cada conta aberta</span>
                    <span className="block text-muted-foreground">
                      Desligado, as contas não ficam âmbar nem vermelhas e o relógio desaparece.
                    </span>
                  </span>
                </label>
                {config.cronometroAtivo ? (
                  <button
                    type="button"
                    onClick={() => setEditandoTempos(true)}
                    className="press mt-4 h-12 w-full rounded-xl border-2 border-border font-bold hover:border-primary"
                  >
                    Ajustar tempos ({config.alertaMin} / {config.atrasoMin} min)
                  </button>
                ) : null}
              </section>

              {/* Fila de preparo: experimental, entra só quando a loja quiser. */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
                  <ChefHat className="size-4" />
                  Fila de preparo (experimental)
                </span>
                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={config.preparoAtivo}
                    onChange={(e) => setConfig({ preparoAtivo: e.target.checked })}
                    className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm">
                    <span className="block font-bold">
                      Tela do ajudante com os pedidos em ordem
                    </span>
                    <span className="block text-muted-foreground">
                      O que for anotado no balcão aparece na bancada com foto, quantidade e tempo
                      de espera — o bilhete de papel deixa de existir.
                    </span>
                  </span>
                </label>
                {config.preparoAtivo ? <CartaoBancada /> : null}
              </section>

              <CartaoInstalar />
            </div>
          ) : null}

          {aba === "recibo" ? (
            <div className="mx-auto max-w-xl">
              <CartaoRecibo />
            </div>
          ) : null}

          {aba === "seguranca" ? (
            <div className="mx-auto max-w-xl">
              <CartaoSeguranca />
            </div>
          ) : null}
        </div>
      </div>


      {rascunho ? (
        <Modal
          titulo={rascunho.id ? "Editar produto" : "Novo produto"}
          subtitulo="Foto, nome, preço e as tags que a busca do balcão entende."
          onFechar={() => setRascunho(null)}
          rodape={
            <>
              <button
                type="button"
                onClick={() => {
                  if (!rascunho.name.trim()) return toast.error("Informe o nome do produto");
                  salvar.mutate(rascunho);
                }}
                disabled={salvar.isPending}
                className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground shadow-lg disabled:opacity-60"
              >
                {salvar.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Plus className="size-5" />
                )}
                {rascunho.id ? "Salvar alterações" : "Adicionar produto"}
              </button>
              <button
                type="button"
                onClick={() => setRascunho(null)}
                className="press h-14 rounded-xl border-2 border-border px-5 font-bold text-muted-foreground"
              >
                Cancelar
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <UploadImagem
                rotulo="Foto do produto"
                valor={rascunho.image_url}
                pasta={pastaProdutos}
                onChange={(v) => setRascunho({ ...rascunho, image_url: v })}
              />
            </div>
            <label className="text-sm font-bold sm:col-span-2">
              Nome
              <input
                autoFocus
                value={rascunho.name}
                onChange={(e) => setRascunho({ ...rascunho, name: texto(e.target.value, 80) })}
                className={campo}
              />
            </label>
            <label className="text-sm font-bold">
              Código (só números)
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex.: 101"
                value={rascunho.code}
                onChange={(e) =>
                  setRascunho({ ...rascunho, code: e.target.value.replace(/\D/g, "") })
                }
                className={cn(campo, "money")}
              />
            </label>

            <label className="text-sm font-bold">
              Categoria
              <select
                value={rascunho.category}
                onChange={(e) => {
                  if (e.target.value === "__nova") return setCriandoCategoria("");
                  setRascunho({ ...rascunho, category: e.target.value });
                }}
                className={campo}
              >
                <option value="">Sem categoria</option>
                {categoriasCardapio.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="__nova">+ Nova categoria…</option>
              </select>
            </label>

            {/* Como o preço nasce: a escolha muda os campos logo abaixo. */}
            <div className="sm:col-span-2">
              <span className="text-sm font-bold">Como é o preço deste produto?</span>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {modosPreco.map((m) => {
                  const Icone = m.icone;
                  const ativo = rascunho.modo === m.valor;
                  return (
                    <button
                      key={m.valor}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setRascunho({ ...rascunho, modo: m.valor })}
                      className={cn(
                        "press flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                        ativo
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      <Icone
                        className={cn("size-6 shrink-0", ativo ? "text-primary" : "text-muted-foreground")}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{m.titulo}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {m.frase}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {rascunho.modo === "fixed" || rascunho.modo === "manual" ? (
              <label className="text-sm font-bold sm:col-span-2">
                {rascunho.modo === "manual" ? "Preço sugerido (R$) — opcional" : "Preço (R$)"}
                <input
                  inputMode="decimal"
                  value={rascunho.price}
                  onChange={(e) => setRascunho({ ...rascunho, price: moeda(e.target.value) })}
                  className={cn(campo, "money")}
                />
              </label>
            ) : null}

            {rascunho.modo === "weight" ? (
              <label className="text-sm font-bold sm:col-span-2">
                Preço por quilo (R$)
                <input
                  inputMode="decimal"
                  value={rascunho.precoKg}
                  onChange={(e) => setRascunho({ ...rascunho, precoKg: moeda(e.target.value) })}
                  placeholder="Ex.: 79,90"
                  className={cn(campo, "money")}
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Na venda o caixa digita os gramas e o valor sai sozinho.
                </span>
              </label>
            ) : null}

            {/* Sabores que não mexem no preço: só a escolha na hora da venda. */}
            {rascunho.modo !== "flavor" ? (
              <div className="sm:col-span-2">
                <span className="text-sm font-bold">Sabores / opções (mesmo preço)</span>
                <p className="text-xs font-normal text-muted-foreground">
                  Ex.: morango, uva, chocolate. Na venda o caixa escolha qual é — o preço não muda.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rascunho.opcoes.map((o, i) => (
                    <span
                      key={`${o}-${i}`}
                      className="flex h-10 items-center gap-1.5 rounded-full bg-secondary pl-3 pr-1.5 text-sm font-bold"
                    >
                      {o}
                      <button
                        type="button"
                        aria-label={`Remover ${o}`}
                        onClick={() =>
                          setRascunho({
                            ...rascunho,
                            opcoes: rascunho.opcoes.filter((_, k) => k !== i),
                          })
                        }
                        className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="size-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  placeholder="Digite um sabor e aperte Enter"
                  aria-label="Novo sabor sem mudança de preço"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const v = e.currentTarget.value.trim();
                    if (!v) return;
                    if (rascunho.opcoes.some((o) => o.toLowerCase() === v.toLowerCase())) {
                      return toast.error("Esse sabor já está na lista");
                    }
                    setRascunho({ ...rascunho, opcoes: [...rascunho.opcoes, v] });
                    e.currentTarget.value = "";
                  }}
                  className={campo}
                />

                {/* Sorvete por bolinha: o cliente monta várias e paga um preço só. */}
                {rascunho.opcoes.length > 1 ? (
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-border bg-secondary/20 p-3">
                    <input
                      type="checkbox"
                      checked={rascunho.opcoesMulti}
                      onChange={(e) =>
                        setRascunho({ ...rascunho, opcoesMulti: e.target.checked })
                      }
                      className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">
                        Permitir escolher mais de um sabor
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        Para casos como sorvete na casquinha: o caixa marca várias bolinhas e
                        o preço continua o mesmo.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>
            ) : null}



            {rascunho.modo === "flavor" ? (
              <div className="sm:col-span-2">
                <span className="text-sm font-bold">Sabores e preços</span>
                {rascunho.sabores.length === 0 ? (
                  <p className="mt-1.5 rounded-xl border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Nenhum sabor cadastrado — adicione o primeiro.
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-2">
                    {rascunho.sabores.map((v, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-[auto_minmax(0,1fr)_9rem_auto] items-center gap-2"
                      >
                        <button
                          type="button"
                          aria-label={`Como cobrar o sabor ${v.nome || i + 1}`}
                          title={
                            v.modo === "manual"
                              ? "Preço digitado na hora — tocar para mudar"
                              : v.modo === "weight"
                                ? "Vendido por peso — tocar para mudar"
                                : "Preço fixo — tocar para mudar"
                          }
                          onClick={() => {
                            const ordem = ["fixed", "manual", "weight"] as const;
                            const prox = ordem[(ordem.indexOf(v.modo) + 1) % ordem.length]!;
                            const sabores = [...rascunho.sabores];
                            sabores[i] = { ...v, modo: prox };
                            setRascunho({ ...rascunho, sabores });
                          }}
                          className="press grid size-12 place-items-center rounded-xl border-2 border-border bg-secondary/30 text-primary hover:border-primary"
                        >
                          {v.modo === "manual" ? (
                            <Pencil className="size-5" />
                          ) : v.modo === "weight" ? (
                            <Scale className="size-5" />
                          ) : (
                            <Tag className="size-5" />
                          )}
                        </button>
                        <input
                          value={v.nome}
                          placeholder="Nome do sabor"
                          autoFocus={i === rascunho.sabores.length - 1 && !v.nome && !v.preco}
                          onChange={(e) => {
                            const sabores = [...rascunho.sabores];
                            sabores[i] = { ...v, nome: texto(e.target.value, 40) };
                            setRascunho({ ...rascunho, sabores });
                          }}
                          className="h-12 min-w-0 rounded-xl border-2 border-border bg-secondary/30 px-3 text-sm outline-none focus:border-primary"
                        />
                        {v.modo === "manual" ? (
                          <span className="px-1 text-xs leading-tight text-muted-foreground">
                            valor digitado na venda
                          </span>
                        ) : v.modo === "weight" ? (
                          <span className="flex h-12 items-center gap-1 rounded-xl border-2 border-border bg-secondary/30 pr-2">
                            <input
                              inputMode="decimal"
                              value={v.precoKg}
                              placeholder="0,00"
                              onChange={(e) => {
                                const sabores = [...rascunho.sabores];
                                sabores[i] = { ...v, precoKg: moeda(e.target.value) };
                                setRascunho({ ...rascunho, sabores });
                              }}
                              className="money h-full min-w-0 flex-1 rounded-xl bg-transparent px-3 text-base outline-none"
                            />
                            <span className="shrink-0 text-xs text-muted-foreground">/kg</span>
                          </span>
                        ) : (
                          <input
                            inputMode="decimal"
                            value={v.preco}
                            placeholder="0,00"
                            onChange={(e) => {
                              const sabores = [...rascunho.sabores];
                              sabores[i] = { ...v, preco: moeda(e.target.value) };
                              setRascunho({ ...rascunho, sabores });
                            }}
                            className="money h-12 min-w-0 rounded-xl border-2 border-border bg-secondary/30 px-3 text-base outline-none focus:border-primary"
                          />
                        )}
                        <button
                          type="button"
                          aria-label={`Remover sabor ${v.nome || i + 1}`}
                          onClick={async () => {
                            const ok = await confirmar({
                              titulo: `Remover o sabor "${v.nome || "sem nome"}"?`,
                              descricao: "Ele deixa de aparecer na hora da venda.",
                              confirmar: "Remover",
                            });
                            if (!ok) return;
                            setRascunho({
                              ...rascunho,
                              sabores: rascunho.sabores.filter((_, j) => j !== i),
                            });
                          }}
                          className="grid size-12 place-items-center rounded-xl text-danger hover:bg-danger-soft"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Tag className="size-3.5" /> preço fixo
                  </span>
                  <span className="flex items-center gap-1">
                    <Pencil className="size-3.5" /> digitado na venda
                  </span>
                  <span className="flex items-center gap-1">
                    <Scale className="size-3.5" /> por peso
                  </span>
                  <span>— toque no ícone para alternar.</span>
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setRascunho({
                      ...rascunho,
                      sabores: [
                        ...rascunho.sabores,
                        { nome: "", preco: "", modo: "fixed", precoKg: "" },
                      ],
                    })
                  }
                  className="press mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border font-bold hover:border-primary"
                >
                  <Plus className="size-4" />
                  Adicionar sabor
                </button>

              </div>
            ) : null}
            <label className="text-sm font-bold">
              Tags (separadas por vírgula)
              <input
                value={rascunho.tags}
                onChange={(e) => setRascunho({ ...rascunho, tags: texto(e.target.value, 120) })}
                className={campo}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-bold sm:col-span-2">
              <input
                type="checkbox"
                checked={rascunho.active}
                onChange={(e) => setRascunho({ ...rascunho, active: e.target.checked })}
                className="size-5 accent-[var(--color-primary)]"
              />
              Produto à venda (aparece no balcão)
            </label>
          </div>
        </Modal>
      ) : null}

      {editandoLoja ? (
        <Modal
          titulo="Dados da loja"
          subtitulo="Nome, contato e logo — o que aparece no topo do recibo."
          onFechar={() => setEditandoLoja(false)}
          rodape={
            <button
              type="button"
              onClick={() => gravarLoja.mutate()}
              disabled={gravarLoja.isPending}
              className="press h-14 flex-1 rounded-xl bg-primary font-bold text-primary-foreground shadow-lg disabled:opacity-60"
            >
              {gravarLoja.isPending ? "Salvando…" : "Salvar dados da loja"}
            </button>
          }
        >
          <UploadImagem
            rotulo="Logo da loja"
            valor={config.logoUrl}
            pasta={pastaLogo}
            redonda
            onChange={(v) => setConfig({ logoUrl: v })}
          />
          <label className="mt-4 block text-sm font-bold">
            Nome
            <input
              value={dadosLoja.store_name}
              onChange={(e) => setDadosLoja({ ...dadosLoja, store_name: e.target.value })}
              className={campo}
            />
          </label>
          <label className="mt-3 block text-sm font-bold">
            Telefone
            <input
              value={dadosLoja.phone}
              onChange={(e) => setDadosLoja({ ...dadosLoja, phone: mascaraTelefone(e.target.value) })}
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              className={cn(campo, !telefoneValido(dadosLoja.phone) && "border-danger")}
            />
          </label>
          <label className="mt-3 block text-sm font-bold">
            Endereço
            <input
              value={dadosLoja.address}
              onChange={(e) => setDadosLoja({ ...dadosLoja, address: texto(e.target.value, 140) })}
              className={campo}
            />
          </label>
        </Modal>
      ) : null}

      {editandoTempos ? (
        <Modal
          titulo="Tempos das comandas"
          subtitulo="Quem define o que é atrasado é a loja, não o sistema."
          onFechar={() => setEditandoTempos(false)}
          rodape={
            <button
              type="button"
              onClick={() => setEditandoTempos(false)}
              className="press h-14 flex-1 rounded-xl bg-primary font-bold text-primary-foreground"
            >
              Pronto
            </button>
          }
        >
          <label className="block text-sm font-bold" htmlFor="alerta">
            Vira atenção (âmbar) aos{" "}
            <span className="money text-warning">{config.alertaMin} min</span>
          </label>
          <input
            id="alerta"
            type="range"
            min={2}
            max={30}
            value={config.alertaMin}
            onChange={(e) =>
              setConfig({ alertaMin: Math.min(Number(e.target.value), config.atrasoMin - 1) })
            }
            className="mt-2 w-full accent-[var(--color-warning)]"
          />

          <label className="mt-4 block text-sm font-bold" htmlFor="atraso">
            Vira atrasada (vermelho) aos{" "}
            <span className="money text-danger">{config.atrasoMin} min</span>
          </label>
          <input
            id="atraso"
            type="range"
            min={5}
            max={60}
            value={config.atrasoMin}
            onChange={(e) =>
              setConfig({ atrasoMin: Math.max(Number(e.target.value), config.alertaMin + 1) })
            }
            className="mt-2 w-full accent-[var(--color-danger)]"
          />

          {/* Prévia ao vivo: a regra é abstrata, a cor não. */}
          <div className="mt-4 flex gap-2">
            {exemplos.map((m) => {
              const u = urgencia(m, config);
              return (
                <span
                  key={m}
                  className={cn(
                    "money flex-1 rounded-lg px-2 py-2 text-center text-lg leading-none",
                    u.cor === "danger"
                      ? "bg-danger text-danger-foreground"
                      : u.cor === "warning"
                        ? "bg-warning text-warning-foreground"
                        : "bg-success-soft text-success",
                  )}
                >
                  {m} min
                </span>
              );
            })}
          </div>
        </Modal>
      ) : null}
      {criandoCategoria !== null ? (
        <Modal
          titulo="Nova categoria"
          subtitulo="Uma pergunta só: como ela se chama?"
          onFechar={() => setCriandoCategoria(null)}
          rodape={
            <button
              type="button"
              onClick={() => {
                const n = criarCategoria(criandoCategoria);
                if (!n) return;
                if (rascunho) setRascunho({ ...rascunho, category: n });
                setCriandoCategoria(null);
              }}
              className="press h-12 rounded-xl bg-primary px-6 font-bold text-primary-foreground"
            >
              Criar categoria
            </button>
          }
        >
          <input
            autoFocus
            value={criandoCategoria}
            onChange={(e) => setCriandoCategoria(texto(e.target.value, 40))}
            placeholder="Ex.: Açaí, Bolos, Bebidas"
            className={campo}
          />
        </Modal>
      ) : null}

      {renomeando ? (
        <Modal
          titulo={`Renomear "${renomeando.de}"`}
          subtitulo="Todos os produtos dessa categoria passam a usar o nome novo."
          onFechar={() => setRenomeando(null)}
          rodape={
            <button
              type="button"
              disabled={renomear.isPending || !renomeando.para.trim()}
              onClick={() => renomear.mutate({ de: renomeando.de, para: renomeando.para.trim() })}
              className="press h-12 rounded-xl bg-primary px-6 font-bold text-primary-foreground disabled:opacity-50"
            >
              {renomear.isPending ? "Salvando…" : "Salvar nome"}
            </button>
          }
        >
          <input
            autoFocus
            value={renomeando.para}
            onChange={(e) => setRenomeando({ ...renomeando, para: texto(e.target.value, 40) })}
            className={campo}
          />
        </Modal>
      ) : null}

      </TravaSecao>
    </AppShell>
  );
}
