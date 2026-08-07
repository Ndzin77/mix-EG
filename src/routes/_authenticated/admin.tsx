import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  IceCream,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Store,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Modal } from "@/components/modal";
import { useConfirmar } from "@/components/confirmar";
import { UploadImagem } from "@/components/upload-imagem";
import { CartaoRecibo } from "@/components/admin/cartao-recibo";
import { moeda, telefone as mascaraTelefone, telefoneValido, texto } from "@/lib/campos";

import { brl, urgencia, useConfig } from "@/lib/config";
import { useImagens } from "@/lib/imagens";
import {
  excluirProduto,
  listarProdutos,
  obterLoja,
  salvarLoja,
  salvarProduto,
} from "@/lib/loja.functions";
import { cn } from "@/lib/utils";

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

type Rascunho = {
  id?: string;
  name: string;
  code: string;
  category: string;
  tags: string;
  price: string;
  active: boolean;
  image_url: string;
};

const rascunhoVazio: Rascunho = {
  name: "",
  code: "",
  category: "",
  tags: "",
  price: "",
  active: true,
  image_url: "",
};

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
  const [editandoLoja, setEditandoLoja] = useState(false);
  const [editandoTempos, setEditandoTempos] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");

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
          price: Number(r.price.replace(",", ".")) || 0,
          active: r.active,
          image_url: r.image_url || null,
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
      <PageHeader title="Admin" subtitle="Produtos, loja, categorias e comandas" />

      <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-24 md:pb-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-2xl border-l-4 border-primary bg-card p-6 shadow-sm">
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

            {produtos.isLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Carregando produtos…</p>
            ) : lista.length === 0 ? (
              <div className="mt-6 rounded-xl border-2 border-dashed border-border p-8 text-center">
                <p className="font-display text-2xl tracking-wide">Cardápio vazio</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre o primeiro sabor — com foto, ele já aparece bonito na tela de vendas.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {grupos.map(([grupo, itens]) => (
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

          <div className="space-y-4">
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

            <CartaoRecibo />

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
          </div>
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
              Preço (R$)
              <input
                inputMode="decimal"
                value={rascunho.price}
                onChange={(e) => setRascunho({ ...rascunho, price: moeda(e.target.value) })}
                className={cn(campo, "money")}
              />
            </label>
            <label className="text-sm font-bold">
              Categoria
              <input
                list="categorias-produto"
                value={rascunho.category}
                onChange={(e) => setRascunho({ ...rascunho, category: texto(e.target.value, 40) })}
                className={campo}
              />
              <datalist id="categorias-produto">
                {grupos.map(([g]) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
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
          subtitulo="Nome, contato, logo e a mensagem impressa no recibo."
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
          <label className="mt-3 block text-sm font-bold">
            Mensagem do recibo
            <textarea
              value={dadosLoja.receipt_footer}
              onChange={(e) => setDadosLoja({ ...dadosLoja, receipt_footer: e.target.value })}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border-2 border-border bg-secondary/30 p-3 text-sm font-normal outline-none transition-colors focus:border-primary focus:bg-card"
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
    </AppShell>
  );
}
