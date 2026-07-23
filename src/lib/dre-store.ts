import { format } from "date-fns";

export type ChannelRow = {
  nome: string;
  receita: number;
  pedidos: number;
  taxas: number; // R$ cobrados pelo app (comissão + serviço) — vem do próprio painel do canal
  descontos: number; // R$ de descontos/promos concedidos no canal
  color: string;
};

export type LineItem = { label: string; valor: number };

export type WeekData = {
  channels: ChannelRow[];
  taxaPagamento: number; // R$ — taxas de cartão/pagamento no total
  embalagens: number;
  freteEntregador: number;
  cmv: number;
  fixos: LineItem[];
  marketing: LineItem[];
  promocoes: LineItem[];
  totalPedidosOverride?: number; // se > 0, usa este total ao invés da soma por canal
  // Simples Nacional — provisão sobre a receita, só abate no lucro quando o pagamento for confirmado
  simplesAliquota: number; // % (ex.: 6)
  impostoPago: boolean;
  impostoPagoValor?: number; // R$ efetivamente pago (default = provisão)
  impostoComprovanteUrl?: string; // data URL do comprovante enviado no chat
  impostoPagoEm?: string; // ISO date
};


export const DEFAULT_CHANNELS: ChannelRow[] = [
  { nome: "iFood", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#EA1D2C" },
  { nome: "99Food", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#FFD100" },
  { nome: "Anotai", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#22C55E" },
  { nome: "Próprio / WhatsApp", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#3B82F6" },
  { nome: "Salão", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#8B5CF6" },
];

export const EMPTY_WEEK: WeekData = {
  channels: DEFAULT_CHANNELS,
  taxaPagamento: 0,
  embalagens: 0,
  freteEntregador: 0,
  cmv: 0,
  fixos: [
    { label: "Aluguel", valor: 0 },
    { label: "Folha de Pagamento", valor: 0 },
    { label: "Pró-labore", valor: 0 },
    { label: "Energia / Água", valor: 0 },
    { label: "Internet / Softwares", valor: 0 },
    { label: "Contador", valor: 0 },
  ],
  marketing: [
    { label: "Ads iFood", valor: 0 },
    { label: "Ads Meta / Google", valor: 0 },
    { label: "Influenciadores", valor: 0 },
  ],
  promocoes: [
    { label: "Cupom / Frete grátis", valor: 0 },
    { label: "Cashback / Fidelidade", valor: 0 },
  ],
};

export const SAMPLE_WEEK: WeekData = {
  channels: [
    { nome: "iFood", receita: 42840, pedidos: 448, taxas: 10710, descontos: 1200, color: "#EA1D2C" },
    { nome: "99Food", receita: 23800, pedidos: 251, taxas: 5236, descontos: 800, color: "#FFD100" },
    { nome: "Anotai", receita: 28560, pedidos: 298, taxas: 2856, descontos: 0, color: "#22C55E" },
    { nome: "Próprio / WhatsApp", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#3B82F6" },
    { nome: "Salão", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#8B5CF6" },
  ],
  taxaPagamento: 2380,
  embalagens: 4285,
  freteEntregador: 1200,
  cmv: 29702,
  fixos: [
    { label: "Aluguel", valor: 6500 },
    { label: "Folha de Pagamento", valor: 7800 },
    { label: "Pró-labore", valor: 0 },
    { label: "Energia / Água", valor: 1950 },
    { label: "Internet / Softwares", valor: 0 },
    { label: "Contador", valor: 0 },
  ],
  marketing: [
    { label: "Ads iFood", valor: 800 },
    { label: "Ads Meta / Google", valor: 400 },
    { label: "Influenciadores", valor: 0 },
  ],
  promocoes: [
    { label: "Cupom / Frete grátis", valor: 600 },
    { label: "Cashback / Fidelidade", valor: 0 },
  ],
};

export function weekKey(from?: Date): string {
  if (!from) return "week-none";
  return `dre-week-${format(from, "yyyy-MM-dd")}`;
}

export function loadWeek(key: string): WeekData {
  if (typeof window === "undefined") return EMPTY_WEEK;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY_WEEK;
    const parsed = JSON.parse(raw) as Partial<WeekData> & {
      channels?: Array<Partial<ChannelRow> & { taxaPct?: number }>;
      taxaPagamentoPct?: number;
    };
    // Merge + migração de campos antigos
    const rawChannels = (parsed.channels?.length ? parsed.channels : EMPTY_WEEK.channels) as Array<
      Partial<ChannelRow> & { taxaPct?: number }
    >;
    const channels: ChannelRow[] = rawChannels.map((c, i) => {
      const base = EMPTY_WEEK.channels[i] ?? EMPTY_WEEK.channels[0];
      const receita = c.receita ?? 0;
      return {
        nome: c.nome ?? base.nome,
        receita,
        pedidos: c.pedidos ?? 0,
        taxas: c.taxas ?? (c.taxaPct ? (receita * c.taxaPct) / 100 : 0),
        descontos: c.descontos ?? 0,
        color: c.color ?? base.color,
      };
    });
    return {
      ...EMPTY_WEEK,
      ...parsed,
      channels,
      taxaPagamento:
        parsed.taxaPagamento ??
        (parsed.taxaPagamentoPct
          ? (channels.reduce((s, c) => s + c.receita, 0) * parsed.taxaPagamentoPct) / 100
          : 0),
      fixos: parsed.fixos ?? EMPTY_WEEK.fixos,
      marketing: parsed.marketing ?? EMPTY_WEEK.marketing,
      promocoes: parsed.promocoes ?? EMPTY_WEEK.promocoes,
    };
  } catch {
    return EMPTY_WEEK;
  }
}

export function saveWeek(key: string, data: WeekData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export type WeekPatch = {
  channels?: Array<{
    nome: string;
    receita?: number;
    pedidos?: number;
    taxas?: number;
    descontos?: number;
  }>;
  embalagens?: number;
  freteEntregador?: number;
  cmv?: number;
  taxaPagamento?: number;
  totalPedidosOverride?: number;
  fixos?: LineItem[];
  marketing?: LineItem[];
  promocoes?: LineItem[];
};


function mergeLineItems(list: LineItem[], patch: LineItem[]): LineItem[] {
  const out = list.map((f) => ({ ...f }));
  for (const item of patch) {
    const idx = out.findIndex((f) => f.label.toLowerCase() === item.label.toLowerCase());
    if (idx >= 0) out[idx] = { ...out[idx], valor: item.valor };
    else out.push({ label: item.label, valor: item.valor });
  }
  return out;
}

export function applyPatch(w: WeekData, patch: WeekPatch): WeekData {
  const next: WeekData = {
    ...w,
    channels: w.channels.map((c) => ({ ...c })),
    fixos: w.fixos.map((f) => ({ ...f })),
    marketing: w.marketing.map((f) => ({ ...f })),
    promocoes: w.promocoes.map((f) => ({ ...f })),
  };
  if (patch.channels) {
    for (const p of patch.channels) {
      const idx = next.channels.findIndex(
        (c) => c.nome.toLowerCase() === p.nome.toLowerCase(),
      );
      if (idx >= 0) {
        next.channels[idx] = {
          ...next.channels[idx],
          ...(p.receita !== undefined ? { receita: p.receita } : {}),
          ...(p.pedidos !== undefined ? { pedidos: p.pedidos } : {}),
          ...(p.taxas !== undefined ? { taxas: p.taxas } : {}),
          ...(p.descontos !== undefined ? { descontos: p.descontos } : {}),
        };
      }
    }
  }
  if (patch.embalagens !== undefined) next.embalagens = patch.embalagens;
  if (patch.freteEntregador !== undefined) next.freteEntregador = patch.freteEntregador;
  if (patch.cmv !== undefined) next.cmv = patch.cmv;
  if (patch.taxaPagamento !== undefined) next.taxaPagamento = patch.taxaPagamento;
  if (patch.totalPedidosOverride !== undefined)
    next.totalPedidosOverride = patch.totalPedidosOverride;

  if (patch.fixos) next.fixos = mergeLineItems(next.fixos, patch.fixos);
  if (patch.marketing) next.marketing = mergeLineItems(next.marketing, patch.marketing);
  if (patch.promocoes) next.promocoes = mergeLineItems(next.promocoes, patch.promocoes);
  return next;
}

export type DreComputed = {
  receitaBruta: number;
  totalPedidos: number;
  ticketMedio: number;
  taxasMarketplace: number;
  taxasPagamento: number;
  descontosTotal: number;
  embalagens: number;
  freteEntregador: number;
  cmv: number;
  cmvPct: number;
  custosVariaveis: number;
  margemContribuicaoValor: number;
  margemContribuicaoPct: number;
  fixosTotal: number;
  marketingTotal: number;
  promocoesTotal: number;
  lucroLiquido: number;
  lucroPct: number;
  canais: { nome: string; receita: number; percentual: number; color: string }[];
};

export function computeDre(w: WeekData): DreComputed {
  const receitaBruta = w.channels.reduce((s, c) => s + (c.receita || 0), 0);
  const somaPedidosCanais = w.channels.reduce((s, c) => s + (c.pedidos || 0), 0);
  const totalPedidos =
    w.totalPedidosOverride && w.totalPedidosOverride > 0
      ? w.totalPedidosOverride
      : somaPedidosCanais;
  const ticketMedio = totalPedidos > 0 ? receitaBruta / totalPedidos : 0;

  const taxasMarketplace = w.channels.reduce((s, c) => s + (c.taxas || 0), 0);
  const descontosTotal = w.channels.reduce((s, c) => s + (c.descontos || 0), 0);
  const taxasPagamento = w.taxaPagamento || 0;
  const custosVariaveis =
    taxasMarketplace +
    taxasPagamento +
    descontosTotal +
    w.embalagens +
    w.freteEntregador +
    w.cmv;
  const cmvPct = receitaBruta > 0 ? (w.cmv / receitaBruta) * 100 : 0;
  const margemContribuicaoValor = receitaBruta - custosVariaveis;
  const margemContribuicaoPct =
    receitaBruta > 0 ? (margemContribuicaoValor / receitaBruta) * 100 : 0;
  const fixosTotal = w.fixos.reduce((s, f) => s + (f.valor || 0), 0);
  const marketingTotal = w.marketing.reduce((s, m) => s + (m.valor || 0), 0);
  const promocoesTotal = w.promocoes.reduce((s, m) => s + (m.valor || 0), 0);
  const lucroLiquido = margemContribuicaoValor - fixosTotal - marketingTotal - promocoesTotal;
  const lucroPct = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  const canais = w.channels
    .filter((c) => (c.receita || 0) > 0)
    .map((c) => ({
      nome: c.nome,
      receita: c.receita,
      percentual: receitaBruta > 0 ? +((c.receita / receitaBruta) * 100).toFixed(1) : 0,
      color: c.color,
    }));

  return {
    receitaBruta,
    totalPedidos,
    ticketMedio,
    taxasMarketplace,
    taxasPagamento,
    descontosTotal,
    embalagens: w.embalagens,
    freteEntregador: w.freteEntregador,
    cmv: w.cmv,
    cmvPct,
    custosVariaveis,
    margemContribuicaoValor,
    margemContribuicaoPct,
    fixosTotal,
    marketingTotal,
    promocoesTotal,
    lucroLiquido,
    lucroPct,
    canais,
  };
}
