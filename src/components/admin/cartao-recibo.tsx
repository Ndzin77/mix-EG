import { useState } from "react";
import { Minus, Plus, Printer, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { FolhaRecibo } from "@/components/recibo/recibo";
import { reciboPadrao, useConfig, type ReciboConfig } from "@/lib/config";
import { cnpj as mascaraCnpj, cnpjValido, inteiro } from "@/lib/campos";
import type { ReciboDados } from "@/lib/recibo";
import { cn } from "@/lib/utils";

/** Venda de mentira só para a dona ver o papel enquanto mexe nas chaves. */
const exemplo: ReciboDados = {
  id: "00000000-0000-0000-0000-0000000a1b2c3",
  label: "Mesa 3",
  operador: "Elaine",
  data: new Date().toISOString(),
  itens: [
    { nome: "Açaí 500ml", qtd: 2, unitario: 20, subtotal: 40 },
    { nome: "Sundae morango", qtd: 1, unitario: 18.5, subtotal: 18.5 },
    { nome: "Bolo fatia", qtd: 3, unitario: 9, subtotal: 27 },
  ],
  bruto: 85.5,
  desconto: 5.5,
  total: 80,
  pagamentos: [
    { forma: "pix", valor: 50 },
    { forma: "cash", valor: 30 },
  ],
  recebido: 50,
  troco: 20,
};

const campo =
  "mt-1.5 h-12 w-full rounded-xl border-2 border-border bg-secondary/30 px-3 text-base font-normal outline-none transition-colors focus:border-primary focus:bg-card";

function Chave({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-secondary/50">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-[var(--color-primary)]"
      />
      <span className="font-bold">{rotulo}</span>
    </label>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-xl border border-border p-3">
      <span className="eyebrow text-muted-foreground">{titulo}</span>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">{children}</div>
    </section>
  );
}
/** Uma pergunta por vez: a rolagem fica curta e o papel do lado não some. */
type Aba = "papel" | "cabecalho" | "corpo" | "rodape";
const abas: { chave: Aba; rotulo: string }[] = [
  { chave: "papel", rotulo: "Papel" },
  { chave: "cabecalho", rotulo: "Cabeçalho" },
  { chave: "corpo", rotulo: "Corpo" },
  { chave: "rodape", rotulo: "Rodapé" },
];


/** Cartão do Admin + editor com pré-visualização ao vivo do papel. */
export function CartaoRecibo() {
  const [config, setConfig] = useConfig();
  const [aberto, setAberto] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [aba, setAba] = useState<Aba>("papel");
  const r: ReciboConfig = { ...reciboPadrao, ...(config.recibo ?? {}) };
  const set = (patch: Partial<ReciboConfig>) => setConfig({ recibo: { ...r, ...patch } });

  const cnpjOk = cnpjValido(r.cnpj);

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5">
        <span className="eyebrow flex items-center gap-1.5 text-muted-foreground">
          <ReceiptText className="size-4" />
          Recibo
        </span>
        <p className="mt-2 font-display text-xl tracking-wide">
          {r.largura === "a4" ? "Folha A4" : `Bobina ${r.largura}`}
        </p>
        <p className="text-xs text-muted-foreground">
          Letra {r.fonte} · logo {r.mostrarLogo ? "visível" : "oculta"}
        </p>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border font-bold hover:border-primary"
        >
          <ReceiptText className="size-4" />
          Personalizar recibo
        </button>
      </section>

      {aberto ? (
        <Modal
          titulo="Recibo"
          subtitulo="Mexa nas chaves e veja o papel mudar do lado."
          onFechar={() => setAberto(false)}
          rodape={
            <>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="press h-14 flex-1 rounded-xl bg-primary font-bold text-primary-foreground shadow-lg"
              >
                Pronto
              </button>
              <button
                type="button"
                onClick={() => {
                  document.body.dataset["recibo"] = r.largura === "a4" ? "a4" : "bobina";
                  window.print();
                  toast.success("Enviado para a impressora");
                }}
                className="press flex h-14 items-center gap-2 rounded-xl border-2 border-border px-5 font-bold"
              >
                <Printer className="size-5" />
                Imprimir teste
              </button>
            </>
          }
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            {/* Coluna das opções: rola sozinha, para o papel do lado nunca
                sair do campo de visão enquanto a dona mexe nas chaves. */}
            <div className="order-2 flex min-h-0 flex-col lg:order-1 lg:h-[64vh]">
              <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto bg-card/95 px-1 pb-2 backdrop-blur">
                {abas.map((a) => (
                  <button
                    key={a.chave}
                    type="button"
                    onClick={() => setAba(a.chave)}
                    className={cn(
                      "press h-10 shrink-0 rounded-xl border-2 px-3 text-xs font-black uppercase tracking-wide",
                      aba === a.chave
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    {a.rotulo}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {aba === "papel" ? (
              <section className="rounded-xl border border-border p-3">
                <span className="eyebrow text-muted-foreground">Papel</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["58mm", "80mm", "a4"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => set({ largura: l })}
                      className={cn(
                        "press h-11 rounded-xl border-2 px-4 text-xs font-black uppercase tracking-wide",
                        r.largura === l
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      {l === "a4" ? "A4" : l}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["pequena", "normal", "grande"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => set({ fonte: f })}
                      className={cn(
                        "press h-11 rounded-xl border-2 px-4 text-xs font-black uppercase tracking-wide",
                        r.fonte === f
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      Letra {f}
                    </button>
                  ))}
                </div>
              </section>
              ) : null}

              {aba === "cabecalho" ? (
              <Grupo titulo="Cabeçalho">
                <Chave
                  rotulo="Logo da loja"
                  valor={r.mostrarLogo}
                  onChange={(v) => set({ mostrarLogo: v })}
                />
                <label className="text-sm font-bold">
                  Tamanho da logo (px)
                  <input
                    inputMode="numeric"
                    value={String(r.tamanhoLogo)}
                    onChange={(e) =>
                      set({ tamanhoLogo: Number(inteiro(e.target.value, 240)) || 0 })
                    }
                    className={cn(campo, "money")}
                  />
                </label>
                <Chave
                  rotulo="Nome da loja"
                  valor={r.mostrarNome}
                  onChange={(v) => set({ mostrarNome: v })}
                />
                <Chave
                  rotulo="Telefone"
                  valor={r.mostrarTelefone}
                  onChange={(v) => set({ mostrarTelefone: v })}
                />
                <Chave
                  rotulo="Endereço"
                  valor={r.mostrarEndereco}
                  onChange={(v) => set({ mostrarEndereco: v })}
                />
                <Chave
                  rotulo="CNPJ"
                  valor={r.mostrarCnpj}
                  onChange={(v) => set({ mostrarCnpj: v })}
                />
                <label className="text-sm font-bold">
                  CNPJ
                  <input
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                    value={r.cnpj}
                    onChange={(e) => set({ cnpj: mascaraCnpj(e.target.value) })}
                    className={cn(campo, "money", !cnpjOk && "border-danger")}
                  />
                  {!cnpjOk ? (
                    <span className="mt-1 block text-xs font-normal text-danger">
                      CNPJ inválido — confira os números.
                    </span>
                  ) : null}
                </label>
                <Chave
                  rotulo="Redes sociais"
                  valor={r.mostrarRedes}
                  onChange={(v) => set({ mostrarRedes: v })}
                />
                <label className="text-sm font-bold">
                  Redes sociais
                  <input
                    value={r.redes}
                    placeholder="@egmix"
                    onChange={(e) => set({ redes: e.target.value.slice(0, 80) })}
                    className={campo}
                  />
                </label>
                <label className="text-sm font-bold sm:col-span-2">
                  Texto livre do cabeçalho
                  <textarea
                    rows={2}
                    value={r.textoCabecalho}
                    onChange={(e) => set({ textoCabecalho: e.target.value.slice(0, 200) })}
                    className="mt-1.5 w-full resize-none rounded-xl border-2 border-border bg-secondary/30 p-3 text-sm font-normal outline-none focus:border-primary focus:bg-card"
                  />
                </label>
              </Grupo>
              ) : null}

              {aba === "corpo" ? (
              <Grupo titulo="Corpo">
                <Chave
                  rotulo="Nº do recibo"
                  valor={r.mostrarNumero}
                  onChange={(v) => set({ mostrarNumero: v })}
                />
                <Chave
                  rotulo="Data e hora"
                  valor={r.mostrarDataHora}
                  onChange={(v) => set({ mostrarDataHora: v })}
                />
                <Chave
                  rotulo="Nome da conta/mesa"
                  valor={r.mostrarConta}
                  onChange={(v) => set({ mostrarConta: v })}
                />
                <Chave
                  rotulo="Operador"
                  valor={r.mostrarOperador}
                  onChange={(v) => set({ mostrarOperador: v })}
                />
                <Chave
                  rotulo="Preço unitário"
                  valor={r.mostrarUnitario}
                  onChange={(v) => set({ mostrarUnitario: v })}
                />
                <Chave
                  rotulo="Desconto"
                  valor={r.mostrarDesconto}
                  onChange={(v) => set({ mostrarDesconto: v })}
                />
                <Chave
                  rotulo="Formas de pagamento"
                  valor={r.mostrarPagamentos}
                  onChange={(v) => set({ mostrarPagamentos: v })}
                />
                <Chave
                  rotulo="Valor recebido"
                  valor={r.mostrarRecebido}
                  onChange={(v) => set({ mostrarRecebido: v })}
                />
                <Chave
                  rotulo="Troco"
                  valor={r.mostrarTroco}
                  onChange={(v) => set({ mostrarTroco: v })}
                />
              </Grupo>
              ) : null}

              {aba === "rodape" ? (
              <Grupo titulo="Rodapé">
                <label className="text-sm font-bold sm:col-span-2">
                  Mensagem impressa
                  <textarea
                    rows={2}
                    value={config.mensagemRecibo}
                    onChange={(e) => setConfig({ mensagemRecibo: e.target.value.slice(0, 200) })}
                    className="mt-1.5 w-full resize-none rounded-xl border-2 border-border bg-secondary/30 p-3 text-sm font-normal outline-none focus:border-primary focus:bg-card"
                  />
                </label>
                <Chave
                  rotulo='Aviso "documento não fiscal"'
                  valor={r.mostrarAgradecimento}
                  onChange={(v) => set({ mostrarAgradecimento: v })}
                />
                <Chave
                  rotulo="Espaço para assinatura"
                  valor={r.assinatura}
                  onChange={(v) => set({ assinatura: v })}
                />
                <label className="text-sm font-bold">
                  Linhas em branco no fim
                  <input
                    inputMode="numeric"
                    value={String(r.linhasBrancas)}
                    onChange={(e) =>
                      set({ linhasBrancas: Number(inteiro(e.target.value, 12)) || 0 })
                    }
                    className={cn(campo, "money")}
                  />
                </label>
              </Grupo>
              ) : null}
              </div>
            </div>

            {/* Espelho do papel: fica colado no topo para a mudança acontecer
                dentro do campo de visão, no mesmo instante do clique. */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-0">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-card/95 pb-2 backdrop-blur">
                <span className="eyebrow truncate text-muted-foreground">
                  Como vai sair · {r.largura === "a4" ? "A4" : `bobina ${r.largura}`}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Diminuir a visualização"
                    onClick={() =>
                      setZoom((z) => Math.max(0.6, Math.round((z - 0.15) * 100) / 100))
                    }
                    className="press grid size-9 place-items-center rounded-lg border-2 border-border font-black"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="money w-12 text-center text-xs tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar a visualização"
                    onClick={() =>
                      setZoom((z) => Math.min(1.6, Math.round((z + 0.15) * 100) / 100))
                    }
                    className="press grid size-9 place-items-center rounded-lg border-2 border-border font-black"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-auto rounded-2xl bg-[repeating-linear-gradient(45deg,var(--color-secondary)_0_10px,transparent_10px_20px)] p-4 shadow-inner">
                <div
                  className="print-area mx-auto w-fit origin-top bg-white shadow-2xl ring-1 ring-black/10 transition-transform duration-200"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <FolhaRecibo
                    dados={exemplo}
                    loja={{ ...config, recibo: r }}
                    formato={r.largura === "a4" ? "a4" : "bobina"}
                  />
                </div>
              </div>
              <p className="mt-2 text-center text-[0.6875rem] font-bold text-muted-foreground">
                Papel de verdade, com uma venda de exemplo — muda a cada toque.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
