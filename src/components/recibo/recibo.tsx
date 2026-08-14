import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { brl, reciboPadrao, type Config, type ReciboConfig } from "@/lib/config";
import { useImagem } from "@/lib/imagens";
import { rotuloForma } from "@/lib/relatorios";
import { cn } from "@/lib/utils";
import { dataHora, numeroRecibo, type FormatoRecibo, type ReciboDados } from "@/lib/recibo";

const escalas: Record<ReciboConfig["fonte"], { bobina: string; a4: string }> = {
  pequena: { bobina: "text-[10px]", a4: "text-[12px]" },
  normal: { bobina: "text-[12px]", a4: "text-[14px]" },
  grande: { bobina: "text-[14px]", a4: "text-[16px]" },
};

/** O papel em si — desenhado igual na tela e na impressora, do jeito que a
 *  loja configurou no Admin. */
export function FolhaRecibo({
  dados,
  loja,
  formato,
}: {
  dados: ReciboDados;
  loja: Config;
  formato: FormatoRecibo;
}) {
  const cfg = { ...reciboPadrao, ...(loja.recibo ?? {}) };
  /* O botão do modal manda no papel; a preferência da loja decide a bobina. */
  const largura = formato === "a4" ? "a4" : cfg.largura === "58mm" ? "58mm" : "80mm";
  const bobina = largura !== "a4";
  const logo = useImagem(loja.logoUrl);
  const cabecalho =
    (cfg.mostrarLogo ? 1 : 0) +
    (cfg.mostrarNome ? 1 : 0) +
    (cfg.mostrarTelefone && loja.telefone ? 1 : 0);

  return (
    <div
      className={cn(
        "recibo-folha mx-auto bg-white p-5 text-black",
        bobina ? "leading-snug" : "w-full max-w-[210mm]",
        largura === "58mm" && "w-[58mm]",
        largura === "80mm" && "w-[80mm]",
        bobina ? escalas[cfg.fonte].bobina : escalas[cfg.fonte].a4,
      )}
    >
      {cabecalho > 0 ||
      cfg.mostrarEndereco ||
      cfg.mostrarCnpj ||
      cfg.mostrarRedes ||
      cfg.textoCabecalho ? (
        <div className="flex flex-col items-center gap-2 text-center">
          {cfg.mostrarLogo && logo ? (
            <img
              src={logo}
              alt=""
              style={{ height: cfg.tamanhoLogo, width: cfg.tamanhoLogo }}
              className="object-contain"
            />
          ) : null}
          {cfg.mostrarNome ? (
            <p className={cn("font-black uppercase leading-tight", bobina ? "text-sm" : "text-xl")}>
              {loja.nomeLoja}
            </p>
          ) : null}
          {cfg.mostrarCnpj && cfg.cnpj ? <p className="text-[11px]">CNPJ {cfg.cnpj}</p> : null}
          {cfg.mostrarTelefone && loja.telefone ? (
            <p className="text-[11px]">Tel. {loja.telefone}</p>
          ) : null}
          {cfg.mostrarEndereco && loja.endereco ? (
            <p className="text-[11px]">{loja.endereco}</p>
          ) : null}
          {cfg.mostrarRedes && cfg.redes ? <p className="text-[11px]">{cfg.redes}</p> : null}
          {cfg.textoCabecalho ? (
            <p className="whitespace-pre-line text-[11px]">{cfg.textoCabecalho}</p>
          ) : null}
        </div>
      ) : null}

      <div className="my-3 border-t border-dashed border-black/40" />

      {cfg.mostrarNumero || cfg.mostrarDataHora ? (
        <div className="flex justify-between text-[11px]">
          <span>{cfg.mostrarNumero ? `Recibo nº ${numeroRecibo(dados.id)}` : ""}</span>
          <span>{cfg.mostrarDataHora ? dataHora(dados.data) : ""}</span>
        </div>
      ) : null}
      {cfg.mostrarConta ? <p className="text-[11px]">Conta: {dados.label}</p> : null}
      {cfg.mostrarOperador && dados.operador ? (
        <p className="text-[11px]">Operador: {dados.operador}</p>
      ) : null}

      <div className="my-3 border-t border-dashed border-black/40" />

      <table className="w-full">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide">
            <th className="pb-1">Item</th>
            <th className="pb-1 text-right">Qtd</th>
            {cfg.mostrarUnitario ? <th className="pb-1 text-right">Unit.</th> : null}
            <th className="pb-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {dados.itens.map((i, k) => (
            <tr key={`${i.nome}-${k}`} className="align-top">
              <td className="py-0.5 pr-2">{i.nome}</td>
              <td className="py-0.5 text-right tabular-nums">{i.qtd}</td>
              {cfg.mostrarUnitario ? (
                <td className="py-0.5 text-right tabular-nums">{brl(i.unitario)}</td>
              ) : null}
              <td className="py-0.5 text-right tabular-nums">{brl(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="space-y-0.5 tabular-nums">
        {cfg.mostrarDesconto && dados.desconto > 0 ? (
          <>
            <Linha rotulo="Subtotal" valor={dados.bruto} />
            <Linha rotulo="Desconto" valor={-dados.desconto} />
          </>
        ) : dados.total > dados.bruto + 0.005 ? (
          /* Pagou mais do que os produtos: o papel mostra de onde veio a sobra. */
          <>
            <Linha rotulo="Subtotal" valor={dados.bruto} />
            <Linha rotulo="Acréscimo" valor={Math.round((dados.total - dados.bruto) * 100) / 100} />
          </>
        ) : null}

        <div className="flex justify-between pt-1 text-base font-black">
          <span>TOTAL</span>
          <span>R$ {brl(dados.total)}</span>
        </div>
        {cfg.mostrarPagamentos
          ? dados.pagamentos.map((p, k) => (
              <Linha key={k} rotulo={rotuloForma[p.forma] ?? p.forma} valor={p.valor} />
            ))
          : null}
        {cfg.mostrarRecebido && dados.recebido !== null ? (
          <Linha rotulo="Recebido" valor={dados.recebido} />
        ) : null}
        {cfg.mostrarTroco && dados.troco ? <Linha rotulo="Troco" valor={dados.troco} /> : null}
      </div>

      <div className="my-3 border-t border-dashed border-black/40" />

      {loja.mensagemRecibo ? (
        <p className="whitespace-pre-line text-center text-[11px]">{loja.mensagemRecibo}</p>
      ) : null}
      {cfg.mostrarAgradecimento ? (
        <p className="mt-1 text-center text-[9px] uppercase tracking-widest text-black/50">
          Documento não fiscal
        </p>
      ) : null}
      {cfg.assinatura ? (
        <div className="mt-8 text-center">
          <div className="mx-auto w-4/5 border-t border-black/60" />
          <p className="mt-1 text-[10px]">Assinatura</p>
        </div>
      ) : null}
      {cfg.linhasBrancas > 0 ? (
        <div aria-hidden style={{ height: `${cfg.linhasBrancas * 14}px` }} />
      ) : null}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex justify-between">
      <span>{rotulo}</span>
      <span>R$ {brl(valor)}</span>
    </div>
  );
}

/** Pré-visualização + impressão. Bobina por padrão, A4 num toque. */
export function ModalRecibo({
  dados,
  loja,
  onFechar,
}: {
  dados: ReciboDados;
  loja: Config;
  onFechar: () => void;
}) {
  const [formato, setFormato] = useState<FormatoRecibo>(
    (loja.recibo ?? reciboPadrao).largura === "a4" ? "a4" : "bobina",
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "Enter") window.print();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  useEffect(() => {
    document.body.dataset["recibo"] = formato;
    return () => {
      delete document.body.dataset["recibo"];
    };
  }, [formato]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recibo"
      className="overlay-in fixed inset-0 z-50 grid place-items-center bg-foreground/45 p-4"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-in flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-primary/30 bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="eyebrow text-muted-foreground">Recibo</p>
            <h2 className="font-display text-2xl leading-tight tracking-wide">
              nº {numeroRecibo(dados.id)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(["bobina", "a4"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormato(f)}
                className={cn(
                  "press h-11 rounded-xl border-2 px-4 text-xs font-black uppercase tracking-wide",
                  formato === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                {f === "bobina" ? "Bobina" : "A4"}
              </button>
            ))}
            <button
              onClick={onFechar}
              aria-label="Fechar recibo"
              className="press grid size-11 place-items-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-secondary/50 p-5">
          <div className="print-area shadow-lg">
            <FolhaRecibo dados={dados} loja={loja} formato={formato} />
          </div>
        </div>

        <div className="border-t border-border bg-secondary/40 p-4">
          <button
            onClick={() => window.print()}
            className="press glow-primary flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary font-display text-2xl tracking-wider text-primary-foreground"
          >
            <Printer className="size-7" />
            Imprimir
            <span className="kbd">Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
