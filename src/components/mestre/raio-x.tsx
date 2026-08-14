import { Modal } from "@/components/modal";
import type { LojaMestre, RaioX as Dados } from "@/lib/mestre.server";
import { cn } from "@/lib/utils";
import {
  Activity,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Image as ImageIcon,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

function quando(iso: string | null) {
  if (!iso) return "nunca";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/** Número grande primeiro, explicação em cinza embaixo: o olho lê o valor
 *  antes da palavra, que é como o cérebro compara rápido. */
function Bloco({
  icone,
  valor,
  rotulo,
  cor,
}: {
  icone: React.ReactNode;
  valor: string;
  rotulo: string;
  cor?: "success" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "results-pop rounded-2xl border-2 p-4",
        cor === "success"
          ? "border-success/50 bg-success-soft"
          : cor === "warning"
            ? "border-warning/50 bg-warning/10"
            : cor === "danger"
              ? "border-danger/50 bg-danger/10"
              : "border-border bg-secondary/40",
      )}
    >
      <span className="flex items-center gap-1.5 text-muted-foreground">{icone}</span>
      <span className="mt-1 block font-display text-3xl leading-none tracking-wide tabular-nums">
        {valor}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{rotulo}</span>
    </div>
  );
}

/**
 * Raio-X da loja: tudo o que costuma explicar um chamado ("não aparece nada",
 * "sumiu minha venda") sem precisar entrar na conta do cliente.
 */
export function RaioXLoja({
  loja,
  dados,
  carregando,
  onFechar,
}: {
  loja: LojaMestre;
  dados: Dados | undefined;
  carregando: boolean;
  onFechar: () => void;
}) {
  return (
    <Modal
      titulo={`Raio-X · ${loja.loja}`}
      subtitulo={loja.email ?? "sem e-mail no perfil"}
      largo
      onFechar={onFechar}
    >
      {carregando || !dados ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/60" />
          ))}
        </div>
      ) : (
        <>
          <div
            className={cn(
              "modal-in flex items-start gap-3 rounded-2xl border-2 p-4",
              dados.veredito.cor === "success"
                ? "border-success bg-success-soft"
                : dados.veredito.cor === "warning"
                  ? "border-warning bg-warning/10"
                  : "border-danger bg-danger/10",
            )}
          >
            <Activity className="mt-1 size-6 shrink-0" />
            <div>
              <p className="font-display text-2xl leading-none tracking-wide">
                {dados.veredito.titulo}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{dados.veredito.texto}</p>
            </div>
          </div>

          <p className="eyebrow mt-5 text-muted-foreground">Catálogo</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Bloco
              icone={<Boxes className="size-4" />}
              valor={String(dados.produtosAtivos)}
              rotulo="produtos ativos"
              cor={dados.produtosAtivos === 0 ? "danger" : "success"}
            />
            <Bloco
              icone={<Boxes className="size-4" />}
              valor={String(dados.produtosInativos)}
              rotulo="desativados"
            />
            <Bloco
              icone={<ImageIcon className="size-4" />}
              valor={String(dados.produtosComFoto)}
              rotulo="com foto"
            />
          </div>

          <p className="eyebrow mt-5 text-muted-foreground">Movimento</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Bloco
              icone={<CircleDollarSign className="size-4" />}
              valor={brl(dados.faturouHoje)}
              rotulo={`hoje · ${dados.vendasHoje} venda(s)`}
              cor={dados.vendasHoje > 0 ? "success" : undefined}
            />
            <Bloco
              icone={<CircleDollarSign className="size-4" />}
              valor={brl(dados.faturou7)}
              rotulo={`7 dias · ${dados.vendas7} venda(s)`}
            />
            <Bloco
              icone={<CircleDollarSign className="size-4" />}
              valor={brl(dados.faturou30)}
              rotulo={`30 dias · ${dados.vendas30} venda(s)`}
            />
            <Bloco
              icone={<Receipt className="size-4" />}
              valor={brl(dados.ticketMedio30)}
              rotulo="ticket médio (30 dias)"
            />
            <Bloco
              icone={<Receipt className="size-4" />}
              valor={String(dados.contasAbertas)}
              rotulo="contas abertas agora"
              cor={dados.contasAbertas > 0 ? "warning" : undefined}
            />
            <Bloco
              icone={<CircleDollarSign className="size-4" />}
              valor={brl(dados.saidasMes)}
              rotulo="saídas do mês"
            />
          </div>

          <p className="eyebrow mt-5 text-muted-foreground">Conta</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Bloco
              icone={<CalendarDays className="size-4" />}
              valor={quando(dados.ultimaVenda)}
              rotulo="última venda"
              cor={dados.ultimaVenda ? undefined : "danger"}
            />
            <Bloco
              icone={<Users className="size-4" />}
              valor={quando(dados.ultimoLogin)}
              rotulo="último acesso do dono"
            />
            <Bloco
              icone={<ShieldCheck className="size-4" />}
              valor={dados.emailConfirmado ? "Sim" : "Não"}
              rotulo="e-mail confirmado"
              cor={dados.emailConfirmado ? "success" : "warning"}
            />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {dados.usuarios} usuário(s) na loja · criada em{" "}
            {dados.criadaEm ? new Date(dados.criadaEm).toLocaleDateString("pt-BR") : "—"} · último
            evento da Kirvano: {loja.ultimoEvento ?? "nenhum"}.
          </p>
        </>
      )}
    </Modal>
  );
}
