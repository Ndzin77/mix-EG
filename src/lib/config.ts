import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferências da loja. A fonte de verdade é a linha de `store_settings` da
 * empresa; o navegador guarda uma cópia só para a tela abrir instantânea e
 * continuar de pé se a rede cair.
 */
export type Config = {
  /** minutos até a comanda virar "atenção" (âmbar) */
  alertaMin: number;
  /** minutos até a comanda virar "atrasada" (vermelho pulsando) */
  atrasoMin: number;
  /** meta de faturamento do dia */
  metaDiaria: number;
  /** caixa do dia começa oculto: o cliente do outro lado do balcão não vê */
  caixaPrivado: boolean;
  /** rodapé impresso no recibo */
  mensagemRecibo: string;
  /** a loja tem salão com mesas? quem só atende balcão desliga e ganha espaço */
  salaoAtivo: boolean;
  /** como a loja chama o lugar: "Mesa", "Box", "Sala", "Cabine"… */
  termoMesa: string;
  /** quantos lugares o salão tem — 0 significa sem salão */
  qtdMesas: number;
  /** destinos que não são mesa e a loja usa todo dia */
  destinos: string[];
  /** cabeçalho do recibo */
  nomeLoja: string;
  telefone: string;
  endereco: string;
  /** logo da loja: `storage:<caminho>` (upload) ou link externo */
  logoUrl: string;
  /** categorias de saída que a loja realmente usa */
  categoriasSaida: string[];
  /** categorias do cardápio: as abas da tela de vendas */
  categoriasProduto: string[];
  /** cronômetro das comandas ligado? quem não corre contra o tempo desliga */
  cronometroAtivo: boolean;
  /** como o papel do recibo é montado */
  recibo: ReciboConfig;
};

/** Tudo que a loja pode ligar, desligar ou escrever no papel do recibo. */
export type ReciboConfig = {
  largura: "58mm" | "80mm" | "a4";
  fonte: "pequena" | "normal" | "grande";
  mostrarLogo: boolean;
  tamanhoLogo: number;
  mostrarNome: boolean;
  cnpj: string;
  mostrarCnpj: boolean;
  mostrarTelefone: boolean;
  mostrarEndereco: boolean;
  redes: string;
  mostrarRedes: boolean;
  textoCabecalho: string;
  mostrarNumero: boolean;
  mostrarDataHora: boolean;
  mostrarConta: boolean;
  mostrarOperador: boolean;
  mostrarUnitario: boolean;
  mostrarDesconto: boolean;
  mostrarPagamentos: boolean;
  mostrarRecebido: boolean;
  mostrarTroco: boolean;
  mostrarAgradecimento: boolean;
  assinatura: boolean;
  linhasBrancas: number;
};

export const reciboPadrao: ReciboConfig = {
  largura: "80mm",
  fonte: "normal",
  mostrarLogo: true,
  tamanhoLogo: 64,
  mostrarNome: true,
  cnpj: "",
  mostrarCnpj: false,
  mostrarTelefone: true,
  mostrarEndereco: true,
  redes: "",
  mostrarRedes: false,
  textoCabecalho: "",
  mostrarNumero: true,
  mostrarDataHora: true,
  mostrarConta: true,
  mostrarOperador: false,
  mostrarUnitario: true,
  mostrarDesconto: true,
  mostrarPagamentos: true,
  mostrarRecebido: true,
  mostrarTroco: true,
  mostrarAgradecimento: true,
  assinatura: false,
  linhasBrancas: 3,
};

export const configPadrao: Config = {
  alertaMin: 8,
  atrasoMin: 15,
  metaDiaria: 1500,
  caixaPrivado: true,
  mensagemRecibo: "Obrigado pela preferência! Volte sempre!",
  salaoAtivo: false,
  termoMesa: "Mesa",
  qtdMesas: 0,
  destinos: ["Balcão"],
  nomeLoja: "EG Mix Sorveteria e Confeitaria",
  telefone: "",
  endereco: "",
  logoUrl: "",
  categoriasSaida: ["Insumos", "Embalagem", "Manutenção", "Retirada", "Outros"],
  categoriasProduto: [],
  cronometroAtivo: true,
  recibo: reciboPadrao,
};

/** Linha de `store_settings` como ela chega do banco. */
export type LinhaLoja = {
  salao_ativo?: boolean | null;
  termo_mesa?: string | null;
  qtd_mesas?: number | null;
  destinos?: string[] | null;
  meta_diaria?: number | string | null;
  alerta_min?: number | null;
  atraso_min?: number | null;
  caixa_privado?: boolean | null;
  receipt_footer?: string | null;
  store_name?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  categorias_saida?: string[] | null;
  categorias_produto?: string[] | null;
  cronometro_ativo?: boolean | null;
  recibo_config?: unknown;
};

/** Banco → preferências da tela. */
export function configDaLinha(linha: LinhaLoja | null | undefined): Partial<Config> {
  if (!linha) return {};
  const p: Partial<Config> = {};
  if (linha.salao_ativo != null) p.salaoAtivo = linha.salao_ativo;
  if (linha.termo_mesa) p.termoMesa = linha.termo_mesa;
  if (linha.qtd_mesas != null) p.qtdMesas = linha.qtd_mesas;
  if (linha.destinos) p.destinos = linha.destinos;
  if (linha.meta_diaria != null) p.metaDiaria = Number(linha.meta_diaria);
  if (linha.alerta_min != null) p.alertaMin = linha.alerta_min;
  if (linha.atraso_min != null) p.atrasoMin = linha.atraso_min;
  if (linha.caixa_privado != null) p.caixaPrivado = linha.caixa_privado;
  if (linha.receipt_footer) p.mensagemRecibo = linha.receipt_footer;
  if (linha.store_name) p.nomeLoja = linha.store_name;
  if (linha.phone != null) p.telefone = linha.phone;
  if (linha.address != null) p.endereco = linha.address;
  if (linha.logo_url != null) p.logoUrl = linha.logo_url;
  if (linha.categorias_saida) p.categoriasSaida = linha.categorias_saida;
  if (linha.categorias_produto) p.categoriasProduto = linha.categorias_produto;
  if (linha.cronometro_ativo != null) p.cronometroAtivo = linha.cronometro_ativo;
  if (linha.recibo_config && typeof linha.recibo_config === "object") {
    p.recibo = { ...reciboPadrao, ...(linha.recibo_config as Partial<ReciboConfig>) };
  }
  return p;
}

/** Preferências da tela → banco (só o que mudou). */
export function linhaDaConfig(patch: Partial<Config>): Record<string, unknown> {
  const l: Record<string, unknown> = {};
  if (patch.salaoAtivo !== undefined) l.salao_ativo = patch.salaoAtivo;
  if (patch.termoMesa !== undefined) l.termo_mesa = patch.termoMesa;
  if (patch.qtdMesas !== undefined) l.qtd_mesas = patch.qtdMesas;
  if (patch.destinos !== undefined) l.destinos = patch.destinos;
  if (patch.metaDiaria !== undefined) l.meta_diaria = patch.metaDiaria;
  if (patch.alertaMin !== undefined) l.alerta_min = patch.alertaMin;
  if (patch.atrasoMin !== undefined) l.atraso_min = patch.atrasoMin;
  if (patch.caixaPrivado !== undefined) l.caixa_privado = patch.caixaPrivado;
  if (patch.mensagemRecibo !== undefined) l.receipt_footer = patch.mensagemRecibo;
  if (patch.nomeLoja !== undefined) l.store_name = patch.nomeLoja;
  if (patch.telefone !== undefined) l.phone = patch.telefone;
  if (patch.endereco !== undefined) l.address = patch.endereco;
  if (patch.logoUrl !== undefined) l.logo_url = patch.logoUrl;
  if (patch.categoriasSaida !== undefined) l.categorias_saida = patch.categoriasSaida;
  if (patch.categoriasProduto !== undefined) l.categorias_produto = patch.categoriasProduto;
  if (patch.cronometroAtivo !== undefined) l.cronometro_ativo = patch.cronometroAtivo;
  if (patch.recibo !== undefined) l.recibo_config = patch.recibo;
  return l;
}


/** Rótulos do salão do jeito que a loja configurou. */
export function rotulosMesa(c: Pick<Config, "salaoAtivo" | "termoMesa" | "qtdMesas">): string[] {
  if (!c.salaoAtivo || c.qtdMesas < 1) return [];
  return Array.from({ length: c.qtdMesas }, (_, i) => `${c.termoMesa} ${i + 1}`);
}

/** Reconhece um rótulo como lugar do salão, respeitando o termo escolhido. */
export function ehMesa(label: string, c: Pick<Config, "termoMesa">) {
  const t = c.termoMesa.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${t}\\s*\\d+$`, "i").test(label.trim());
}

const CHAVE = "egmix.config.v1";

let atual: Config = configPadrao;
let carregado = false;
const ouvintes = new Set<() => void>();

/* Quem sabe gravar no banco se registra aqui (ver useSincronizarConfig). */
type Persistidor = (patch: Partial<Config>) => void;
let persistidor: Persistidor | null = null;

export function definirPersistidorConfig(p: Persistidor | null) {
  persistidor = p;
}

function carregar(): Config {
  if (carregado || typeof window === "undefined") return atual;
  carregado = true;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (bruto) atual = { ...configPadrao, ...(JSON.parse(bruto) as Partial<Config>) };
  } catch {
    /* preferência corrompida não pode derrubar o caixa */
  }
  return atual;
}

function guardarLocal() {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    /* modo privado do navegador: segue em memória */
  }
}

function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Aplica o que veio do banco sem devolver a gravação (evita eco). */
export function hidratarConfig(patch: Partial<Config>) {
  const proximo = { ...carregar(), ...patch };
  if (JSON.stringify(proximo) === JSON.stringify(atual)) return;
  atual = proximo;
  guardarLocal();
  ouvintes.forEach((fn) => fn());
}

export function salvarConfig(patch: Partial<Config>) {
  atual = { ...carregar(), ...patch };
  guardarLocal();
  ouvintes.forEach((fn) => fn());
  persistidor?.(patch);
}

export function useConfig(): [Config, (patch: Partial<Config>) => void] {
  const valor = useSyncExternalStore(assinar, carregar, () => configPadrao);
  const set = useCallback((patch: Partial<Config>) => salvarConfig(patch), []);
  return [valor, set];
}

/** Três faixas apenas: mais que isso o olho compara em vez de reagir. */
export function urgencia(min: number, c: Pick<Config, "alertaMin" | "atrasoMin">) {
  if (min >= c.atrasoMin) return { rotulo: "atrasada", cor: "danger" as const, peso: 2 };
  if (min >= c.alertaMin) return { rotulo: "atenção", cor: "warning" as const, peso: 1 };
  return { rotulo: "no prazo", cor: "success" as const, peso: 0 };
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
