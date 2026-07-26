import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Calculator } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listFixedCosts,
  saveFixedCosts,
  totalMonthly,
  costPerDay,
  daysInMonth,
  type FixedCost,
} from "@/lib/fixed-costs-store";
import {
  listSavedWeeks,
  loadWeek,
  saveWeek,
  weekKey,
  applyPatch,
} from "@/lib/dre-store";
import { format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/custos-fixos")({
  head: () => ({
    meta: [
      { title: "Custos Fixos — Itadaki Sushi" },
      {
        name: "description",
        content:
          "Cadastre custos fixos mensais e distribua o valor por dia/semana automaticamente na DRE.",
      },
      { property: "og:title", content: "Custos Fixos — Itadaki Sushi" },
      {
        property: "og:description",
        content: "Rateio automático de custos fixos por dia na sua DRE semanal.",
      },
    ],
  }),
  component: CustosFixosPage,
});

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CustosFixosPage() {
  const [items, setItems] = useState<FixedCost[]>([]);
  const [label, setLabel] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setItems(listFixedCosts());
  }, []);

  function persist(next: FixedCost[]) {
    setItems(next);
    saveFixedCosts(next);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(valor.replace(",", "."));
    if (!label.trim() || !v || v <= 0) return;
    persist([
      ...items,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: label.trim(),
        valorMensal: v,
        diaVencimento: dia ? Math.max(1, Math.min(31, parseInt(dia, 10))) : undefined,
      },
    ]);
    setLabel("");
    setValor("");
    setDia("");
  }

  function handleRemove(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  const now = new Date();
  const dim = daysInMonth(now);
  const totalMes = useMemo(() => totalMonthly(items), [items]);
  const perDay = useMemo(() => costPerDay(items, now), [items]);
  const perWeek = perDay * 7;

  function aplicarRateioNaSemanaAtual() {
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const key = weekKey(monday);
    const week = loadWeek(key);
    // Rateio: valor/dia × 7 (semana), substituindo/somando labels
    const fixosPatch = items.map((it) => ({
      label: it.label,
      valor: +((it.valorMensal / dim) * 7).toFixed(2),
    }));
    const updated = applyPatch(week, { fixos: fixosPatch });
    saveWeek(key, updated);
    setFeedback(
      `Rateio aplicado na semana de ${format(monday, "dd MMM yyyy", { locale: ptBR })}: ${currency(perWeek)} distribuído em ${items.length} custos.`,
    );
    setTimeout(() => setFeedback(null), 6000);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <Wallet className="h-5 w-5 text-slate-500" />
          <div>
            <h1 className="text-lg font-semibold">Custos Fixos Mensais</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cadastre e distribua por dia · {dim} dias em {format(now, "MMMM yyyy", { locale: ptBR })}
            </p>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          {/* Resumo */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total fixo mensal
              </p>
              <p className="mt-2 text-2xl font-semibold">{currency(totalMes)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Custo por dia
              </p>
              <p className="mt-2 text-2xl font-semibold">{currency(perDay)}</p>
              <p className="text-[11px] text-slate-400">÷ {dim} dias</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Custo por semana (7 dias)
              </p>
              <p className="mt-2 text-2xl font-semibold">{currency(perWeek)}</p>
            </div>
          </section>

          {/* Form */}
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-3 text-sm font-semibold">Adicionar custo fixo</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_100px_auto]">
              <Input
                placeholder="Ex: Aluguel, Sem Limite, Folha..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Valor mensal R$"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="Dia venc."
                value={dia}
                onChange={(e) => setDia(e.target.value)}
              />
              <Button type="submit" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </form>
          </section>

          {/* Lista */}
          <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">
                {items.length === 0 ? "Nenhum custo cadastrado" : `${items.length} custos cadastrados`}
              </h2>
            </div>
            {items.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Adicione seu primeiro custo fixo acima.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="hidden grid-cols-12 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:grid dark:text-slate-500">
                  <div className="col-span-5">Custo</div>
                  <div className="col-span-2 text-right">Mensal</div>
                  <div className="col-span-2 text-right">Por dia</div>
                  <div className="col-span-2 text-right">Vencimento</div>
                  <div className="col-span-1" />
                </div>
                {items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 items-center gap-y-1 px-5 py-3 text-sm">
                    <div className="col-span-10 font-medium sm:col-span-5">{it.label}</div>
                    <div className="col-span-6 text-right font-mono tabular-nums sm:col-span-2">
                      {currency(it.valorMensal)}
                    </div>
                    <div className="col-span-6 text-right font-mono tabular-nums text-slate-500 sm:col-span-2">
                      {currency(it.valorMensal / dim)}
                    </div>
                    <div className="col-span-6 text-right text-xs text-slate-500 sm:col-span-2">
                      {it.diaVencimento ? `dia ${it.diaVencimento}` : "—"}
                    </div>
                    <div className="col-span-6 flex justify-end sm:col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(it.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rateio */}
          {items.length > 0 && (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                    Aplicar rateio na semana atual
                  </h3>
                  <p className="mt-1 text-xs text-indigo-800/80 dark:text-indigo-300/80">
                    Distribui {currency(perWeek)} nos custos fixos da semana de{" "}
                    {format(startOfWeek(now, { weekStartsOn: 1 }), "dd MMM yyyy", { locale: ptBR })}.
                    Substitui os valores atuais para evitar duplicação.
                  </p>
                </div>
                <Button
                  onClick={aplicarRateioNaSemanaAtual}
                  className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Calculator className="h-4 w-4" /> Aplicar
                </Button>
              </div>
              {feedback && (
                <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-emerald-700 dark:bg-slate-900 dark:text-emerald-400">
                  {feedback}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
