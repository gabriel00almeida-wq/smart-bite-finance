import { format, parseISO, isWithinInterval } from "date-fns";

export type ChannelRow = {
  nome: string;
  receita: number;
  pedidos: number;
  taxas: number; // R$ cobrados pelo app (comissão + serviço) — vem do próprio painel do canal
  descontos: number; // R$ de descontos/promos concedidos no canal
  color: string;
};

export type LineItem = { label: string; valor: number };

export type MonthlyAllocation = {
  label: string;
  valorMensal: number;
  categoria: "fixo" | "marketing";
};

export type LedgerSource = "chat" | "nota" | "form";

export type LedgerCategory =
  | "cmv"
  | "embalagens"
  | "frete"
  | "taxaPagamento"
  | "fixo"
  | "marketing"
  | "promocao"
  | "canal-receita"
  | "canal-pedidos"
  | "canal-taxa"
  | "canal-desconto"
  | "imposto"
  | "estoque"
  | "outro";

export type WeekEntry = {
  id: string;
  at: number; // timestamp
  source: LedgerSource;
  categoria: LedgerCategory;
  label: string; // rótulo humano (ex.: "Hortifruti", "Sem Limite", "iFood receita")
  valor: number;
  note?: string; // texto original da mensagem
};

export type WeekData = {
  channels: ChannelRow[];
  taxaPagamento: number;
  embalagens: number;
  freteEntregador: number;
  cmv: number;
  fixos: LineItem[];
  marketing: LineItem[];
  promocoes: LineItem[];
  totalPedidosOverride?: number;
  simplesAliquota: number;
  impostoPago: boolean;
  impostoPagoValor?: number;
  impostoComprovanteUrl?: string;
  impostoPagoEm?: string;
  estoqueValor?: number; // R$ que ficou em estoque (não consumido) — abate no CMV Real
  ledger?: WeekEntry[]; // log de lançamentos individuais
};

export const DEFAULT_CHANNELS: ChannelRow[] = [
  { nome: "iFood", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#EA1D2C" },
  { nome: "99Food", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#FFD100" },
  { nome: "Anotai", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#2563EB" },
  { nome: "Próprio / WhatsApp", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#3B82F6" },
  { nome: "Salão", receita: 0, pedidos: 0, taxas: 0, descontos: 0, color: "#8B5CF6" },
];

export const EMPTY_WEEK: WeekData = {
  channels: DEFAULT_CHANNELS,
  taxaPagamento: 0,
  embalagens: 0,
  freteEntregador: 0,
  cmv: 0,
  fixos: [],
  marketing: [],
  promocoes: [],
  simplesAliquota: 6,
  impostoPago: false,
  estoqueValor: 0,
  ledger: [],
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
        color:
          DEFAULT_CHANNELS.find(
            (d) => d.nome.toLowerCase() === (c.nome ?? base.nome).toLowerCase(),
          )?.color ?? base.color,
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
      fixos: parsed.fixos ?? [],
      marketing: parsed.marketing ?? [],
      promocoes: parsed.promocoes ?? [],
      ledger: parsed.ledger ?? [],
      estoqueValor: parsed.estoqueValor ?? 0,
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
  /** Rótulos descritivos informados pelo usuário (ex: "Poços Food Service"). */
  cmvLabel?: string;
  embalagensLabel?: string;
  freteLabel?: string;
  taxaPagamentoLabel?: string;
  totalPedidosOverride?: number;
  fixos?: LineItem[];
  marketing?: LineItem[];
  promocoes?: LineItem[];
  simplesAliquota?: number;
  impostoPago?: boolean;
  impostoPagoValor?: number;
  impostoComprovanteUrl?: string;
  impostoPagoEm?: string;
  estoqueValor?: number;
  rateiosMensais?: MonthlyAllocation[];
  remocoes?: RemovalRequest[];
  removerRateios?: string[];
};

export type RemovalScope =
  | "fixo"
  | "marketing"
  | "promocao"
  | "cmv"
  | "embalagens"
  | "frete"
  | "taxaPagamento"
  | "estoque";

export type RemovalRequest = {
  escopo: RemovalScope;
  label?: string;
  valor?: number; // se omitido, zera/remove a linha inteira
};

function labelMatches(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\(rateio\)/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function removeLineItems(list: LineItem[], label?: string, valor?: number): LineItem[] {
  if (!label) return [];
  return list
    .map((item) =>
      labelMatches(item.label, label)
        ? { ...item, valor: valor !== undefined ? Math.max(0, item.valor - valor) : 0 }
        : item,
    )
    .filter((item) => item.valor > 0);
}

/** Remove lançamentos pedidos pelo usuário no chat (ex.: "tira a maquininha do rateio"). */
export function applyRemovals(w: WeekData, remocoes: RemovalRequest[]): WeekData {
  const next: WeekData = {
    ...w,
    channels: w.channels.map((c) => ({ ...c })),
    fixos: w.fixos.map((f) => ({ ...f })),
    marketing: w.marketing.map((f) => ({ ...f })),
    promocoes: w.promocoes.map((f) => ({ ...f })),
    ledger: [...(w.ledger ?? [])],
  };
  for (const r of remocoes) {
    switch (r.escopo) {
      case "fixo":
        next.fixos = removeLineItems(next.fixos, r.label, r.valor);
        break;
      case "marketing":
        next.marketing = removeLineItems(next.marketing, r.label, r.valor);
        break;
      case "promocao":
        next.promocoes = removeLineItems(next.promocoes, r.label, r.valor);
        break;
      case "cmv":
        next.cmv = r.valor !== undefined ? Math.max(0, next.cmv - r.valor) : 0;
        break;
      case "embalagens":
        next.embalagens = r.valor !== undefined ? Math.max(0, next.embalagens - r.valor) : 0;
        break;
      case "frete":
        next.freteEntregador =
          r.valor !== undefined ? Math.max(0, next.freteEntregador - r.valor) : 0;
        break;
      case "taxaPagamento":
        next.taxaPagamento = r.valor !== undefined ? Math.max(0, next.taxaPagamento - r.valor) : 0;
        break;
      case "estoque":
        next.estoqueValor = 0;
        break;
    }
    if (r.label) {
      next.ledger = (next.ledger ?? []).filter((e) => !labelMatches(e.label, r.label!));
    }
  }
  return next;
}

/**
 * Remove um rateio mensal de TODAS as semanas salvas a partir da data informada
 * até 31/12 do mesmo ano (desfaz applyMonthlyAllocationsUntilYearEnd).
 */
export function removeMonthlyAllocationsUntilYearEnd(labels: string[], startDate: Date): number {
  if (typeof window === "undefined" || labels.length === 0) return 0;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(start.getFullYear(), 11, 31);
  let touched = 0;
  for (const entry of listSavedWeeks()) {
    if (entry.startDate < new Date(start.getFullYear(), start.getMonth(), 1)) continue;
    if (entry.startDate > end) continue;
    let data = entry.data;
    let changed = false;
    for (const label of labels) {
      const before = JSON.stringify([data.fixos, data.marketing, data.promocoes]);
      data = applyRemovals(data, [
        { escopo: "fixo", label },
        { escopo: "marketing", label },
        { escopo: "promocao", label },
      ]);
      if (JSON.stringify([data.fixos, data.marketing, data.promocoes]) !== before) changed = true;
    }
    if (changed) {
      saveWeek(entry.key, data);
      touched++;
    }
  }
  return touched;
}

/** Ajuste manual de um valor da DRE (sem IA). */
export type ManualTarget =
  | { kind: "cmv" | "embalagens" | "frete" | "taxaPagamento" | "estoque" | "aliquota" | "impostoPagoValor" | "pedidos" }
  | { kind: "canal"; nome: string; campo: "receita" | "pedidos" | "taxas" | "descontos" }
  | { kind: "linha"; lista: "fixos" | "marketing" | "promocoes"; label: string };

export function setManualValue(w: WeekData, target: ManualTarget, valor: number): WeekData {
  const v = Math.max(0, Number.isFinite(valor) ? valor : 0);
  const next: WeekData = {
    ...w,
    channels: w.channels.map((c) => ({ ...c })),
    fixos: w.fixos.map((f) => ({ ...f })),
    marketing: w.marketing.map((f) => ({ ...f })),
    promocoes: w.promocoes.map((f) => ({ ...f })),
    ledger: [...(w.ledger ?? [])],
  };
  if (target.kind === "canal") {
    const idx = next.channels.findIndex((c) => c.nome === target.nome);
    if (idx >= 0) next.channels[idx] = { ...next.channels[idx], [target.campo]: v };
    return next;
  }
  if (target.kind === "linha") {
    const list = next[target.lista];
    const idx = list.findIndex((i) => i.label === target.label);
    if (idx >= 0) {
      if (v === 0) next[target.lista] = list.filter((_, i) => i !== idx);
      else next[target.lista] = list.map((i, k) => (k === idx ? { ...i, valor: v } : i));
    } else if (v > 0) {
      next[target.lista] = [...list, { label: target.label, valor: v }];
    }
    return next;
  }
  switch (target.kind) {
    case "cmv":
      next.cmv = v;
      break;
    case "embalagens":
      next.embalagens = v;
      break;
    case "frete":
      next.freteEntregador = v;
      break;
    case "taxaPagamento":
      next.taxaPagamento = v;
      break;
    case "estoque":
      next.estoqueValor = v;
      break;
    case "aliquota":
      next.simplesAliquota = v;
      break;
    case "impostoPagoValor":
      next.impostoPagoValor = v;
      next.impostoPago = v > 0;
      break;
    case "pedidos":
      next.totalPedidosOverride = v > 0 ? v : undefined;
      break;
  }
  return next;
}


export function applyMonthlyAllocationsUntilYearEnd(
  allocations: MonthlyAllocation[],
  startDate: Date,
  meta: { source: LedgerSource; note?: string },
): number {
  if (typeof window === "undefined" || allocations.length === 0) return 0;

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(start.getFullYear(), 11, 31);
  if (start > end) return 0;

  const weekly = new Map<string, MonthlyAllocation[]>();
  for (const allocation of allocations) {
    if (!Number.isFinite(allocation.valorMensal) || allocation.valorMensal <= 0) continue;
    const amounts = new Map<string, number>();
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const monday = new Date(day);
      const weekday = monday.getDay();
      monday.setDate(monday.getDate() - (weekday === 0 ? 6 : weekday - 1));
      const key = weekKey(monday);
      const monthDays = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
      amounts.set(key, (amounts.get(key) ?? 0) + allocation.valorMensal / monthDays);
    }
    for (const [key, amount] of amounts) {
      const list = weekly.get(key) ?? [];
      list.push({ ...allocation, valorMensal: +amount.toFixed(2) });
      weekly.set(key, list);
    }
  }

  for (const [key, entries] of weekly) {
    const patch: WeekPatch = {};
    const fixos = entries
      .filter((entry) => entry.categoria === "fixo")
      .map((entry) => ({ label: `${entry.label} (rateio)`, valor: entry.valorMensal }));
    const marketing = entries
      .filter((entry) => entry.categoria === "marketing")
      .map((entry) => ({ label: `${entry.label} (rateio)`, valor: entry.valorMensal }));
    if (fixos.length > 0) patch.fixos = fixos;
    if (marketing.length > 0) patch.marketing = marketing;
    const updated = applyChatPatch(loadWeek(key), patch, meta);
    saveWeek(key, updated);
  }

  return weekly.size;
}

function mergeLineItemsReplace(list: LineItem[], patch: LineItem[]): LineItem[] {
  const out = list.map((f) => ({ ...f }));
  for (const item of patch) {
    const idx = out.findIndex((f) => f.label.toLowerCase() === item.label.toLowerCase());
    if (idx >= 0) out[idx] = { ...out[idx], valor: item.valor };
    else out.push({ label: item.label, valor: item.valor });
  }
  return out;
}

function mergeLineItemsAdditive(list: LineItem[], patch: LineItem[]): LineItem[] {
  const out = list.map((f) => ({ ...f }));
  for (const item of patch) {
    const idx = out.findIndex((f) => f.label.toLowerCase() === item.label.toLowerCase());
    if (idx >= 0) out[idx] = { ...out[idx], valor: (out[idx].valor || 0) + item.valor };
    else out.push({ label: item.label, valor: item.valor });
  }
  return out;
}

// applyPatch (REPLACE) — usado pelo formulário "Editar dados"
export function applyPatch(w: WeekData, patch: WeekPatch): WeekData {
  const next: WeekData = {
    ...w,
    channels: w.channels.map((c) => ({ ...c })),
    fixos: w.fixos.map((f) => ({ ...f })),
    marketing: w.marketing.map((f) => ({ ...f })),
    promocoes: w.promocoes.map((f) => ({ ...f })),
    ledger: [...(w.ledger ?? [])],
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
  if (patch.fixos) next.fixos = mergeLineItemsReplace(next.fixos, patch.fixos);
  if (patch.marketing) next.marketing = mergeLineItemsReplace(next.marketing, patch.marketing);
  if (patch.promocoes) next.promocoes = mergeLineItemsReplace(next.promocoes, patch.promocoes);
  if (patch.simplesAliquota !== undefined) next.simplesAliquota = patch.simplesAliquota;
  if (patch.impostoPago !== undefined) next.impostoPago = patch.impostoPago;
  if (patch.impostoPagoValor !== undefined) next.impostoPagoValor = patch.impostoPagoValor;
  if (patch.impostoComprovanteUrl !== undefined)
    next.impostoComprovanteUrl = patch.impostoComprovanteUrl;
  if (patch.impostoPagoEm !== undefined) next.impostoPagoEm = patch.impostoPagoEm;
  if (patch.estoqueValor !== undefined) next.estoqueValor = Math.max(0, patch.estoqueValor);
  return next;
}

// applyChatPatch (ADITIVO em custos, replace em canais/pedidos) — usado pelo Cérebro
// Também gera entradas no ledger para cada valor lançado.
export function applyChatPatch(
  w: WeekData,
  patch: WeekPatch,
  meta: { source: LedgerSource; note?: string; at?: number },
): WeekData {
  const at = meta.at ?? Date.now();
  const src = meta.source;
  const newEntries: WeekEntry[] = [];
  const mkId = () => `${at}-${Math.random().toString(36).slice(2, 9)}`;
  if (patch.remocoes?.length) w = applyRemovals(w, patch.remocoes);



  const next: WeekData = {
    ...w,
    channels: w.channels.map((c) => ({ ...c })),
    fixos: w.fixos.map((f) => ({ ...f })),
    marketing: w.marketing.map((f) => ({ ...f })),
    promocoes: w.promocoes.map((f) => ({ ...f })),
    ledger: [...(w.ledger ?? [])],
  };

  if (patch.channels) {
    for (const p of patch.channels) {
      const idx = next.channels.findIndex(
        (c) => c.nome.toLowerCase() === p.nome.toLowerCase(),
      );
      if (idx < 0) continue;
      if (p.receita !== undefined) {
        next.channels[idx].receita = p.receita;
        newEntries.push({
          id: mkId(), at, source: src, categoria: "canal-receita",
          label: `${p.nome} — receita`, valor: p.receita, note: meta.note,
        });
      }
      if (p.pedidos !== undefined) {
        next.channels[idx].pedidos = p.pedidos;
        newEntries.push({
          id: mkId(), at, source: src, categoria: "canal-pedidos",
          label: `${p.nome} — pedidos`, valor: p.pedidos, note: meta.note,
        });
      }
      if (p.taxas !== undefined) {
        next.channels[idx].taxas = p.taxas;
        newEntries.push({
          id: mkId(), at, source: src, categoria: "canal-taxa",
          label: `${p.nome} — taxa do app`, valor: p.taxas, note: meta.note,
        });
      }
      if (p.descontos !== undefined) {
        next.channels[idx].descontos = p.descontos;
        newEntries.push({
          id: mkId(), at, source: src, categoria: "canal-desconto",
          label: `${p.nome} — descontos`, valor: p.descontos, note: meta.note,
        });
      }
    }
  }

  // Custos aditivos
  if (patch.embalagens !== undefined && patch.embalagens > 0) {
    next.embalagens = (next.embalagens || 0) + patch.embalagens;
    newEntries.push({
      id: mkId(), at, source: src, categoria: "embalagens",
      label: patch.embalagensLabel?.trim() || "Embalagens", valor: patch.embalagens, note: meta.note,
    });
  }
  if (patch.freteEntregador !== undefined && patch.freteEntregador > 0) {
    next.freteEntregador = (next.freteEntregador || 0) + patch.freteEntregador;
    newEntries.push({
      id: mkId(), at, source: src, categoria: "frete",
      label: patch.freteLabel?.trim() || "Frete / entregador", valor: patch.freteEntregador, note: meta.note,
    });
  }
  if (patch.cmv !== undefined && patch.cmv > 0) {
    next.cmv = (next.cmv || 0) + patch.cmv;
    // Prioriza o rótulo que a IA extraiu do texto do usuário (ex: "Poços Food Service")
    const inferredLabel = patch.cmvLabel?.trim() || inferCmvLabel(meta.note) || "CMV / insumos";
    newEntries.push({
      id: mkId(), at, source: src, categoria: "cmv",
      label: inferredLabel, valor: patch.cmv, note: meta.note,
    });
  }
  if (patch.taxaPagamento !== undefined && patch.taxaPagamento > 0) {
    next.taxaPagamento = (next.taxaPagamento || 0) + patch.taxaPagamento;
    newEntries.push({
      id: mkId(), at, source: src, categoria: "taxaPagamento",
      label: patch.taxaPagamentoLabel?.trim() || "Taxa de cartão / pagamento", valor: patch.taxaPagamento, note: meta.note,
    });
  }

  if (patch.fixos) {
    next.fixos = mergeLineItemsAdditive(next.fixos, patch.fixos);
    for (const it of patch.fixos) {
      newEntries.push({
        id: mkId(), at, source: src, categoria: "fixo",
        label: it.label, valor: it.valor, note: meta.note,
      });
    }
  }
  if (patch.marketing) {
    next.marketing = mergeLineItemsAdditive(next.marketing, patch.marketing);
    for (const it of patch.marketing) {
      newEntries.push({
        id: mkId(), at, source: src, categoria: "marketing",
        label: it.label, valor: it.valor, note: meta.note,
      });
    }
  }
  if (patch.promocoes) {
    next.promocoes = mergeLineItemsAdditive(next.promocoes, patch.promocoes);
    for (const it of patch.promocoes) {
      newEntries.push({
        id: mkId(), at, source: src, categoria: "promocao",
        label: it.label, valor: it.valor, note: meta.note,
      });
    }
  }

  if (patch.totalPedidosOverride !== undefined)
    next.totalPedidosOverride = patch.totalPedidosOverride;
  if (patch.simplesAliquota !== undefined) next.simplesAliquota = patch.simplesAliquota;
  if (patch.impostoPago !== undefined) next.impostoPago = patch.impostoPago;
  if (patch.impostoPagoValor !== undefined) {
    next.impostoPagoValor = patch.impostoPagoValor;
    if (patch.impostoPagoValor > 0) {
      newEntries.push({
        id: mkId(), at, source: src, categoria: "imposto",
        label: "DAS pago", valor: patch.impostoPagoValor, note: meta.note,
      });
    }
  }
  if (patch.impostoComprovanteUrl !== undefined)
    next.impostoComprovanteUrl = patch.impostoComprovanteUrl;
  if (patch.impostoPagoEm !== undefined) next.impostoPagoEm = patch.impostoPagoEm;
  if (patch.estoqueValor !== undefined) {
    next.estoqueValor = Math.max(0, patch.estoqueValor);
    newEntries.push({
      id: mkId(), at, source: src, categoria: "estoque",
      label: "Estoque final (abatimento do CMV Real)", valor: Math.max(0, patch.estoqueValor), note: meta.note,
    });
  }

  next.ledger = [...(next.ledger ?? []), ...newEntries];
  return next;
}

function inferCmvLabel(note?: string): string | null {
  if (!note) return null;
  const t = note.toLowerCase();
  const keywords = ["hortifruti", "salmão", "salmao", "arroz", "peixe", "carne", "verdura", "fruta", "sacolão", "mercado", "atacadão", "atacado", "insumo"];
  for (const k of keywords) if (t.includes(k)) return k.charAt(0).toUpperCase() + k.slice(1);
  // Pega primeira palavra "grande" após "gastei/comprei/paguei"
  const m = t.match(/(?:gastei|comprei|paguei|foi|foram)\s+(?:r?\$?\s*[\d.,]+\s+)?(?:em|de|no|na|com)?\s*([a-zà-ú]+)/i);
  if (m && m[1] && m[1].length > 3) return m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return null;
}

export function removeLedgerEntry(w: WeekData, entryId: string): WeekData {
  const ledger = w.ledger ?? [];
  const entry = ledger.find((e) => e.id === entryId);
  if (!entry) return w;
  const next: WeekData = {
    ...w,
    channels: w.channels.map((c) => ({ ...c })),
    fixos: w.fixos.map((f) => ({ ...f })),
    marketing: w.marketing.map((f) => ({ ...f })),
    promocoes: w.promocoes.map((f) => ({ ...f })),
    ledger: ledger.filter((e) => e.id !== entryId),
  };
  const v = entry.valor;
  switch (entry.categoria) {
    case "cmv":
      next.cmv = Math.max(0, (next.cmv || 0) - v);
      break;
    case "embalagens":
      next.embalagens = Math.max(0, (next.embalagens || 0) - v);
      break;
    case "frete":
      next.freteEntregador = Math.max(0, (next.freteEntregador || 0) - v);
      break;
    case "taxaPagamento":
      next.taxaPagamento = Math.max(0, (next.taxaPagamento || 0) - v);
      break;
    case "fixo":
      next.fixos = subtractFromLineItem(next.fixos, entry.label, v);
      break;
    case "marketing":
      next.marketing = subtractFromLineItem(next.marketing, entry.label, v);
      break;
    case "promocao":
      next.promocoes = subtractFromLineItem(next.promocoes, entry.label, v);
      break;
    case "canal-receita":
    case "canal-pedidos":
    case "canal-taxa":
    case "canal-desconto": {
      const nome = entry.label.split(" — ")[0];
      const idx = next.channels.findIndex((c) => c.nome.toLowerCase() === nome.toLowerCase());
      if (idx >= 0) {
        if (entry.categoria === "canal-receita") next.channels[idx].receita = Math.max(0, next.channels[idx].receita - v);
        if (entry.categoria === "canal-pedidos") next.channels[idx].pedidos = Math.max(0, next.channels[idx].pedidos - v);
        if (entry.categoria === "canal-taxa") next.channels[idx].taxas = Math.max(0, next.channels[idx].taxas - v);
        if (entry.categoria === "canal-desconto") next.channels[idx].descontos = Math.max(0, next.channels[idx].descontos - v);
      }
      break;
    }
    case "imposto":
      next.impostoPagoValor = Math.max(0, (next.impostoPagoValor || 0) - v);
      if ((next.impostoPagoValor ?? 0) === 0) next.impostoPago = false;
      break;
    case "estoque":
      next.estoqueValor = 0;
      break;
  }
  return next;
}

function subtractFromLineItem(list: LineItem[], label: string, v: number): LineItem[] {
  return list
    .map((f) => (f.label.toLowerCase() === label.toLowerCase() ? { ...f, valor: Math.max(0, f.valor - v) } : f))
    .filter((f) => f.valor > 0);
}

export type DreComputed = {
  receitaBruta: number;
  receitaLiquida: number;
  totalPedidos: number;
  ticketMedio: number;
  taxasMarketplace: number;
  taxasPagamento: number;
  descontosTotal: number;
  embalagens: number;
  freteEntregador: number;
  cmv: number;
  cmvContabil: number;
  cmvContabilPct: number;
  cmvFinanceiroPct: number;
  cmvReal: number;
  cmvRealPct: number;
  estoqueValor: number;
  custosVariaveis: number;
  margemContribuicaoValor: number;
  margemContribuicaoPct: number;
  fixosTotal: number;
  marketingTotal: number;
  promocoesTotal: number;
  simplesAliquota: number;
  impostoProvisao: number;
  impostoDeduzido: number;
  impostoPago: boolean;
  lucroLiquido: number;
  lucroLiquidoProjetado: number;
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
  const promocoesTotal = w.promocoes.reduce((s, m) => s + (m.valor || 0), 0);

  // Embalagens entram no CMV (delivery)
  const cmvContabil = (w.cmv || 0) + (w.embalagens || 0);
  const receitaLiquida = receitaBruta - taxasMarketplace - taxasPagamento - descontosTotal - promocoesTotal;
  const estoqueValor = w.estoqueValor || 0;
  const cmvReal = Math.max(0, cmvContabil - estoqueValor);

  const cmvContabilPct = receitaBruta > 0 ? (cmvContabil / receitaBruta) * 100 : 0;
  const cmvFinanceiroPct = receitaLiquida > 0 ? (cmvContabil / receitaLiquida) * 100 : 0;
  const cmvRealPct = receitaLiquida > 0 ? (cmvReal / receitaLiquida) * 100 : 0;

  const custosVariaveis =
    taxasMarketplace + taxasPagamento + descontosTotal + w.freteEntregador + cmvContabil;
  const margemContribuicaoValor = receitaBruta - custosVariaveis;
  const margemContribuicaoPct =
    receitaBruta > 0 ? (margemContribuicaoValor / receitaBruta) * 100 : 0;
  const fixosTotal = w.fixos.reduce((s, f) => s + (f.valor || 0), 0);
  const marketingTotal = w.marketing.reduce((s, m) => s + (m.valor || 0), 0);
  const lucroAntesImposto =
    margemContribuicaoValor - fixosTotal - marketingTotal - promocoesTotal;
  const simplesAliquota = w.simplesAliquota || 0;
  const impostoProvisao = (receitaBruta * simplesAliquota) / 100;
  const impostoDeduzido = w.impostoPago
    ? w.impostoPagoValor && w.impostoPagoValor > 0
      ? w.impostoPagoValor
      : impostoProvisao
    : 0;
  const lucroLiquido = lucroAntesImposto - impostoDeduzido;
  const lucroLiquidoProjetado = lucroAntesImposto - impostoProvisao;
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
    receitaLiquida,
    totalPedidos,
    ticketMedio,
    taxasMarketplace,
    taxasPagamento,
    descontosTotal,
    embalagens: w.embalagens,
    freteEntregador: w.freteEntregador,
    cmv: w.cmv,
    cmvContabil,
    cmvContabilPct,
    cmvFinanceiroPct,
    cmvReal,
    cmvRealPct,
    estoqueValor,
    custosVariaveis,
    margemContribuicaoValor,
    margemContribuicaoPct,
    fixosTotal,
    marketingTotal,
    promocoesTotal,
    simplesAliquota,
    impostoProvisao,
    impostoDeduzido,
    impostoPago: !!w.impostoPago,
    lucroLiquido,
    lucroLiquidoProjetado,
    lucroPct,
    canais,
  };
}

// ---------- Histórico e agregação multi-semana ----------

export type SavedWeekEntry = {
  key: string;
  startDate: Date;
  data: WeekData;
};

const KEY_PREFIX = "dre-week-";

export function listSavedWeeks(): SavedWeekEntry[] {
  if (typeof window === "undefined") return [];
  const out: SavedWeekEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const iso = k.slice(KEY_PREFIX.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    try {
      const startDate = parseISO(iso);
      const data = loadWeek(k);
      out.push({ key: k, startDate, data });
    } catch {
      // ignore
    }
  }
  return out.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

export function deleteWeek(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

function mergeChannelsSum(all: ChannelRow[][]): ChannelRow[] {
  const map = new Map<string, ChannelRow>();
  for (const list of all) {
    for (const c of list) {
      const existing = map.get(c.nome);
      if (existing) {
        existing.receita += c.receita || 0;
        existing.pedidos += c.pedidos || 0;
        existing.taxas += c.taxas || 0;
        existing.descontos += c.descontos || 0;
      } else {
        map.set(c.nome, { ...c });
      }
    }
  }
  const order = DEFAULT_CHANNELS.map((c) => c.nome);
  return [...map.values()].sort(
    (a, b) => order.indexOf(a.nome) - order.indexOf(b.nome),
  );
}

function mergeLineItemsSum(all: LineItem[][]): LineItem[] {
  const map = new Map<string, number>();
  for (const list of all) {
    for (const item of list) {
      const k = item.label.toLowerCase();
      map.set(k, (map.get(k) || 0) + (item.valor || 0));
    }
  }
  const labelCase = new Map<string, string>();
  for (const list of all) {
    for (const item of list) {
      const k = item.label.toLowerCase();
      if (!labelCase.has(k)) labelCase.set(k, item.label);
    }
  }
  return [...map.entries()].map(([k, valor]) => ({
    label: labelCase.get(k) || k,
    valor,
  }));
}

export function aggregateWeeks(weeks: WeekData[]): WeekData {
  if (weeks.length === 0) return EMPTY_WEEK;
  if (weeks.length === 1) return weeks[0];
  const impostoPagoValor = weeks.reduce(
    (s, w) => s + (w.impostoPago ? w.impostoPagoValor || 0 : 0),
    0,
  );
  const anyPago = weeks.some((w) => w.impostoPago);
  const aliquota =
    weeks.find((w) => w.simplesAliquota > 0)?.simplesAliquota ??
    weeks[0].simplesAliquota ??
    0;
  // Pedidos: por semana usa o override quando existir, senão a soma dos canais.
  // (Somar apenas os overrides zerava as semanas sem override e inflava o ticket médio.)
  const totalOverride = weeks.reduce((s, w) => {
    const canais = w.channels.reduce((a, c) => a + (c.pedidos || 0), 0);
    const efetivo =
      w.totalPedidosOverride && w.totalPedidosOverride > 0
        ? w.totalPedidosOverride
        : canais;
    return s + efetivo;
  }, 0);
  const ledger = weeks.flatMap((w) => w.ledger ?? []);
  return {
    channels: mergeChannelsSum(weeks.map((w) => w.channels)),
    taxaPagamento: weeks.reduce((s, w) => s + (w.taxaPagamento || 0), 0),
    embalagens: weeks.reduce((s, w) => s + (w.embalagens || 0), 0),
    freteEntregador: weeks.reduce((s, w) => s + (w.freteEntregador || 0), 0),
    cmv: weeks.reduce((s, w) => s + (w.cmv || 0), 0),
    fixos: mergeLineItemsSum(weeks.map((w) => w.fixos)),
    marketing: mergeLineItemsSum(weeks.map((w) => w.marketing)),
    promocoes: mergeLineItemsSum(weeks.map((w) => w.promocoes)),
    totalPedidosOverride: totalOverride > 0 ? totalOverride : undefined,
    simplesAliquota: aliquota,
    impostoPago: anyPago,
    impostoPagoValor: impostoPagoValor > 0 ? impostoPagoValor : undefined,
    // Estoque é uma fotografia de fechamento, não um fluxo: no consolidado,
    // usa somente o saldo da semana final (a lista chega da mais recente para a mais antiga).
    estoqueValor: weeks[0]?.estoqueValor || 0,
    ledger,
  };
}

export function weeksInRange(from: Date, to: Date): SavedWeekEntry[] {
  const all = listSavedWeeks();
  const start = from <= to ? from : to;
  const end = to >= from ? to : from;
  return all.filter((e) =>
    isWithinInterval(e.startDate, { start, end }),
  );
}
