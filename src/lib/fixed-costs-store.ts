export type FixedCost = {
  id: string;
  label: string;
  valorMensal: number;
  diaVencimento?: number;
};

const KEY = "dre-fixed-costs";

export function listFixedCosts(): FixedCost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FixedCost[];
  } catch {
    return [];
  }
}

export function saveFixedCosts(list: FixedCost[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function daysInMonth(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function totalMonthly(list: FixedCost[]): number {
  return list.reduce((s, f) => s + (f.valorMensal || 0), 0);
}

export function costPerDay(list: FixedCost[], ref: Date = new Date()): number {
  const total = totalMonthly(list);
  const dim = daysInMonth(ref);
  return dim > 0 ? total / dim : 0;
}
