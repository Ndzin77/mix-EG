import { useState } from "react";
import { Printer, ReceiptText } from "lucide-react";
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

/** Cartão do Admin + editor com pré-visualização ao vivo do papel. */
export function CartaoRecibo() {
  const [config, setConfig] = useConfig();
  const [aberto, setAberto] = useState(false);
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
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
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
                    onChange={(e) => set({ tamanhoLogo: Number(inteiro(e.target.value, 240)) || 0 })}
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
                <Chave rotulo="CNPJ" valor={r.mostrarCnpj} onChange={(v) => set({ mostrarCnpj: v })} />
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
                <Chave rotulo="Troco" valor={r.mostrarTroco} onChange={(v) => set({ mostrarTroco: v })} />
              </Grupo>

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
                    onChange={(e) => set({ linhasBrancas: Number(inteiro(e.target.value, 12)) || 0 })}
                    className={cn(campo, "money")}
                  />
                </label>
              </Grupo>
            </div>

            <div className="lg:sticky lg:top-0">
              <span className="eyebrow text-muted-foreground">Como vai sair</span>
              <div className="print-area mt-2 overflow-x-auto rounded-xl bg-secondary/50 p-3 shadow-inner">
                <FolhaRecibo
                  dados={exemplo}
                  loja={{ ...config, recibo: r }}
                  formato={r.largura === "a4" ? "a4" : "bobina"}
                />
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
