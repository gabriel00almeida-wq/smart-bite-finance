import { format } from "date-fns";

export type ChannelRow = {
  nome: string;
  receita: number;
  pedidos: number;
  taxaPct: number;
  color: string;
};

export type LineItem = { label: string; valor: number };

export type WeekData = {
  channels: ChannelRow[];
  taxaPagamentoPct: number;
  embalagens: number;
  freteEntregador: number;
  cmv: number;
  fixos: LineItem[];
  marketing: LineItem[];
};

export const DEFAULT_CHANNELS: ChannelRow[] = [
  { nome: "iFood", receita: 0, pedidos: 0, taxaPct: 25, color: "#EA1D2C" },
  { nome: "99Food", receita: 0, pedidos: 0, taxaPct: 22, color: "#FFD100" },
  { nome: "Anotai", receita: 0, pedidos: 0, taxaPct: 10, color: "#22C55E" },
  { nome: "Próprio / WhatsApp", receita: 0, pedidos: 0, taxaPct: 0, color: "#3B82F6" },
  { nome: "Salão", receita: 0, pedidos: 0, taxaPct: 0, color: "#8B5CF6" },
];

export const EMPTY_WEEK: WeekData = {
  channels: DEFAULT_CHANNELS,
  taxaPagamentoPct: 2.5,
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
};

export const SAMPLE_WEEK: WeekData = {
  channels: [
    { nome: "iFood", receita: 42840, pedidos: 448, taxaPct: 25, color: "#EA1D2C" },
    { nome: "99Food", receita: 23800, pedidos: 251, taxaPct: 22, color: "#FFD100" },
    { nome: "Anotai", receita: 28560, pedidos: 298, taxaPct: 10, color: "#22C55E" },
    { nome: "Próprio / WhatsApp", receita: 0, pedidos: 0, taxaPct: 0, color: "#3B82F6" },
    { nome: "Salão", receita: 0, pedidos: 0, taxaPct: 0, color: "#8B5CF6" },
  ],
  taxaPagamentoPct: 2.5,
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
    const parsed = JSON.parse(raw) as WeekData;
    // Merge to guarantee shape
    return {
      ...EMPTY_WEEK,
      ...parsed,
      channels: parsed.channels?.length ? parsed.channels : EMPTY_WEEK.channels,
      fixos: parsed.fixos ?? EMPTY_WEEK.fixos,
      marketing: parsed.marketing ?? EMPTY_WEEK.marketing,
    };
  } catch {
    return EMPTY_WEEK;
  }
}

export function saveWeek(key: string, data: WeekData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export type DreComputed = {
  receitaBruta: number;
  totalPedidos: number;
  ticketMedio: number;
  taxasMarketplace: number;
  taxasPagamento: number;
  embalagens: number;
  freteEntregador: number;
  cmv: number;
  cmvPct: number;
  custosVariaveis: number;
  margemContribuicaoValor: number;
  margemContribuicaoPct: number;
  fixosTotal: number;
  marketingTotal: number;
  lucroLiquido: number;
  lucroPct: number;
  canais: { nome: string; receita: number; percentual: number; color: string }[];
};

export function computeDre(w: WeekData): DreComputed {
  const receitaBruta = w.channels.reduce((s, c) => s + (c.receita || 0), 0);
  const totalPedidos = w.channels.reduce((s, c) => s + (c.pedidos || 0), 0);
  const ticketMedio = totalPedidos > 0 ? receitaBruta / totalPedidos : 0;
  const taxasMarketplace = w.channels.reduce(
    (s, c) => s + ((c.receita || 0) * (c.taxaPct || 0)) / 100,
    0,
  );
  const taxasPagamento = (receitaBruta * (w.taxaPagamentoPct || 0)) / 100;
  const custosVariaveis =
    taxasMarketplace + taxasPagamento + w.embalagens + w.freteEntregador + w.cmv;
  const cmvPct = receitaBruta > 0 ? (w.cmv / receitaBruta) * 100 : 0;
  const margemContribuicaoValor = receitaBruta - custosVariaveis;
  const margemContribuicaoPct =
    receitaBruta > 0 ? (margemContribuicaoValor / receitaBruta) * 100 : 0;
  const fixosTotal = w.fixos.reduce((s, f) => s + (f.valor || 0), 0);
  const marketingTotal = w.marketing.reduce((s, m) => s + (m.valor || 0), 0);
  const lucroLiquido = margemContribuicaoValor - fixosTotal - marketingTotal;
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
    embalagens: w.embalagens,
    freteEntregador: w.freteEntregador,
    cmv: w.cmv,
    cmvPct,
    custosVariaveis,
    margemContribuicaoValor,
    margemContribuicaoPct,
    fixosTotal,
    marketingTotal,
    lucroLiquido,
    lucroPct,
    canais,
  };
}
