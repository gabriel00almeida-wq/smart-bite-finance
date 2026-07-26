import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  LayoutDashboard,
  FileBarChart,
  Sparkles,
  Plug,
  Download,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  UploadCloud,
  CheckCircle2,
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  Receipt,
  Brain,
  Moon,
  Sun,
  CalendarIcon,
  Loader2,
  Pencil,
  Camera,
  ImagePlus,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import logoAsset from "@/assets/itadaki-logo.png.asset.json";
import {
  computeDre,
  loadWeek,
  saveWeek,
  weekKey,
  EMPTY_WEEK,
  type WeekData,
} from "@/lib/dre-store";
import { applyPatch, type WeekPatch } from "@/lib/dre-store";
import { EditWeekSheet } from "@/components/EditWeekSheet";
import { AiChatSheet } from "@/components/AiChatSheet";
import { useServerFn } from "@tanstack/react-start";
import { chatCerebro } from "@/lib/ai-analysis.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Itadaki Sushi — DRE Delivery" },
      {
        name: "description",
        content:
          "Painel de DRE semanal do Itadaki Sushi: KPIs, CMV, canais e análise IA de gestão financeira do delivery.",
      },
      { property: "og:title", content: "Itadaki Sushi — DRE Delivery" },
      {
        property: "og:description",
        content: "Controle margem, CMV e lucro do delivery com análise IA.",
      },
    ],
  }),
  component: Dashboard,
});

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FileBarChart, label: "DRE Completa" },
  { icon: Sparkles, label: "Motor de Custos (IA)" },
  { icon: Plug, label: "Integrações" },
];

const refrigerados = [
  { nome: "Salmão", unidade: "kg" },
  { nome: "Cream Cheese", unidade: "kg" },
  { nome: "Kani", unidade: "kg" },
  { nome: "Camarão", unidade: "kg" },
];
const secos = [
  { nome: "Arroz", unidade: "kg" },
  { nome: "Nori", unidade: "un" },
  { nome: "Gergelim", unidade: "kg" },
  { nome: "Açúcar", unidade: "kg" },
];

function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendUp,
  positive = true,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: boolean;
  trendLabel?: string;
  trendUp?: boolean;
  positive?: boolean;
}) {
  const good = positive;
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              good
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
            }`}
          >
            {trendUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DreRow({
  label,
  value,
  children,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
}) {
  if (!children) {
    return (
      <div
        className={`flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 ${
          highlight
            ? "bg-emerald-50/60 font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
            : muted
              ? "text-slate-600 dark:text-slate-400"
              : "text-slate-800 dark:text-slate-200"
        }`}
      >
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
    );
  }
  return (
    <AccordionItem value={label} className="border-b border-slate-100 dark:border-slate-800">
      <AccordionTrigger className="px-5 py-4 hover:no-underline">
        <div className="flex w-full items-center justify-between pr-2">
          <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
          <span className="font-mono tabular-nums text-slate-900 dark:text-white">{value}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-slate-50/60 px-5 pb-3 pt-1 dark:bg-slate-950/40">
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm text-slate-600 dark:text-slate-400">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const initial = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(initial);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark] as const;
}

function Dashboard() {
  const [sobras, setSobras] = useState<Record<string, string>>({});
  const [dark, setDark] = useDarkMode();
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  });
  const [week, setWeek] = useState<WeekData>(EMPTY_WEEK);
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [scannedNotes, setScannedNotes] = useState<{ preview: string; summary: string; at: number }[]>([]);
  const scanUploadRef = useRef<HTMLInputElement>(null);
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const chat = useServerFn(chatCerebro);

  const key = weekKey(range?.from);

  // Load stored data whenever the week changes
  useEffect(() => {
    setWeek(loadWeek(key));
  }, [key]);

  const dre = useMemo(() => computeDre(week), [week]);
  const hasData = dre.receitaBruta > 0;

  const rangeLabel = range?.from
    ? range.to
      ? `${format(range.from, "dd MMM", { locale: ptBR })} → ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`
      : format(range.from, "dd MMM yyyy", { locale: ptBR })
    : "Escolher período";

  function handleSave(data: WeekData) {
    saveWeek(key, data);
    setWeek(data);
  }

  function handleWeekChangeFromChat(data: WeekData) {
    saveWeek(key, data);
    setWeek(data);
  }

  async function handleScanFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 3);
    setScanMsg(null);
    setScanning(true);
    try {
      const dataUrls = await Promise.all(
        list.map(
          (f) =>
            new Promise<string>((resolve, reject) => {
              if (!f.type.startsWith("image/")) {
                reject(new Error("Apenas imagens."));
                return;
              }
              if (f.size > 8 * 1024 * 1024) {
                reject(new Error(`"${f.name}" passa de 8MB.`));
                return;
              }
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.onerror = () => reject(r.error);
              r.readAsDataURL(f);
            }),
        ),
      );
      const res = await chat({
        data: {
          messages: [
            {
              role: "user",
              content:
                "Leia esta(s) nota(s) fiscal(is) / comprovante(s) e extraia os valores para a DRE (embalagens, CMV, taxa de cartão, fixos, imposto pago etc.). Só use números visíveis na imagem.",
              images: dataUrls,
            },
          ],
          currentWeek: week,
          periodo: rangeLabel,
        },
      });
      let patch: WeekPatch = {};
      try {
        patch = JSON.parse(res.patchJson) as WeekPatch;
      } catch {
        patch = {};
      }
      const hasPatch =
        !!patch &&
        Object.keys(patch).some((k) => {
          const v = (patch as Record<string, unknown>)[k];
          return Array.isArray(v) ? v.length > 0 : v !== undefined;
        });
      if (hasPatch) {
        const updated = applyPatch(week, patch);
        saveWeek(key, updated);
        setWeek(updated);
      }
      setScannedNotes((n) =>
        [
          { preview: dataUrls[0], summary: res.reply || (hasPatch ? "Nota lida" : "Sem dados"), at: Date.now() },
          ...n,
        ].slice(0, 5),
      );
      setScanMsg({ ok: hasPatch, text: hasPatch ? "DRE atualizada com a nota." : res.reply || "Nada extraído." });
    } catch (e) {
      setScanMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao processar a nota." });
    } finally {
      setScanning(false);
    }
  }

  const revenueChart = [
    {
      periodo: rangeLabel,
      Receita: dre.receitaBruta,
      Custos: dre.custosVariaveis + dre.fixosTotal + dre.marketingTotal,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 text-slate-200 lg:flex dark:bg-slate-950 dark:border-r dark:border-slate-800">
        <div className="flex items-center gap-3 px-6 py-6">
          <img
            src={logoAsset.url}
            alt="Itadaki Sushi"
            className="h-11 w-11 rounded-lg bg-slate-800 object-contain p-1"
          />
          <div>
            <div className="text-sm font-semibold text-white">Itadaki Sushi</div>
            <div className="text-xs text-slate-400">Finance OS</div>
          </div>
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                item.active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-6 py-6 text-xs text-slate-500">v1.0 · Julho 2026</div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Itadaki Sushi"
              className="h-10 w-10 shrink-0 rounded-lg bg-slate-900 object-contain p-1 lg:hidden"
            />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                Dashboard Financeiro
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                Apuração semanal · Itadaki Sushi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 bg-white dark:bg-slate-900">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">{rangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={1}
                  locale={ptBR}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>

            <Button
              className="h-9 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Editar dados</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-white dark:bg-slate-900"
              onClick={() => setAiOpen(true)}
              title="Análise IA — CEO QI 200"
            >
              <Brain className="h-4 w-4 text-indigo-500" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-white dark:bg-slate-900"
              onClick={() => setDark(!dark)}
              title={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="outline" className="hidden md:inline-flex">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          {!hasData && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Nenhuma apuração para essa semana ainda.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Clique em <strong>Editar dados</strong> para lançar receitas por canal, custos e
                CMV. Tudo é calculado automaticamente.
              </p>
              <Button
                className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Começar apuração
              </Button>
            </div>
          )}

          {/* KPIs */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Margem de Contribuição"
              value={`${dre.margemContribuicaoPct.toFixed(1)}%`}
              icon={Percent}
              positive={dre.margemContribuicaoPct >= 15}
            />
            <KpiCard
              title="CMV Real"
              value={`${dre.cmvPct.toFixed(1)}%`}
              icon={Receipt}
              positive={dre.cmvPct <= 35 && dre.cmvPct > 0}
            />
            <KpiCard
              title="Lucro Líquido"
              value={currency(dre.lucroLiquido)}
              icon={DollarSign}
              positive={dre.lucroLiquido >= 0}
            />
            <KpiCard
              title="Ticket Médio"
              value={currency(dre.ticketMedio)}
              icon={TrendingUp}
            />
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 lg:col-span-2 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Receita vs Custos
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Semana atual</p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  BRL
                </Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="periodo" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => currency(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Receita" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Custos" fill="#1e293b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Vendas por Canal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição semanal</p>
              </div>
              <div className="h-56">
                {dre.canais.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dre.canais}
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="percentual"
                      >
                        {dre.canais.map((c) => (
                          <Cell key={c.nome} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-xs text-slate-400">
                    Sem receitas lançadas
                  </div>
                )}
              </div>
              <ul className="mt-2 space-y-2">
                {dre.canais.map((c) => (
                  <li key={c.nome} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.nome}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {c.percentual}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* DRE */}
          <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  DRE — Demonstração do Resultado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Período: {rangeLabel}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
            <Accordion type="multiple" defaultValue={["Receita Bruta Total", "Custos Variáveis"]}>
              <DreRow label="Receita Bruta Total" value={currency(dre.receitaBruta)}>
                {week.channels
                  .filter((c) => c.receita > 0)
                  .map((c) => (
                    <SubRow
                      key={c.nome}
                      label={`${c.nome} (${dre.receitaBruta > 0 ? ((c.receita / dre.receitaBruta) * 100).toFixed(1) : 0}%)`}
                      value={currency(c.receita)}
                    />
                  ))}
                {dre.canais.length === 0 && <SubRow label="—" value={currency(0)} />}
              </DreRow>
              <DreRow label="Custos Variáveis" value={`- ${currency(dre.custosVariaveis)}`}>
                <SubRow label="CMV (Insumos)" value={`- ${currency(dre.cmv)}`} />
                <SubRow label="Embalagens" value={`- ${currency(dre.embalagens)}`} />
                <SubRow label="Frete / entregador" value={`- ${currency(dre.freteEntregador)}`} />
                <SubRow label="Taxas / comissões dos apps" value={`- ${currency(dre.taxasMarketplace)}`} />
                <SubRow label="Descontos concedidos" value={`- ${currency(dre.descontosTotal)}`} />
                <SubRow label="Taxas de cartão / pagamento" value={`- ${currency(dre.taxasPagamento)}`} />
              </DreRow>
              <DreRow
                label="Margem de Contribuição"
                value={`${dre.margemContribuicaoPct.toFixed(1)}% · ${currency(dre.margemContribuicaoValor)}`}
              />
              <DreRow label="Custos Fixos" value={`- ${currency(dre.fixosTotal)}`}>
                {week.fixos
                  .filter((f) => f.valor > 0)
                  .map((f, i) => (
                    <SubRow key={i} label={f.label} value={`- ${currency(f.valor)}`} />
                  ))}
                {dre.fixosTotal === 0 && <SubRow label="—" value={currency(0)} />}
              </DreRow>
              <DreRow label="Marketing / Investimentos" value={`- ${currency(dre.marketingTotal)}`}>
                {week.marketing
                  .filter((f) => f.valor > 0)
                  .map((f, i) => (
                    <SubRow key={i} label={f.label} value={`- ${currency(f.valor)}`} />
                  ))}
                {dre.marketingTotal === 0 && <SubRow label="—" value={currency(0)} />}
              </DreRow>
              <DreRow label="Promoções e Incentivos" value={`- ${currency(dre.promocoesTotal)}`}>
                {week.promocoes
                  .filter((f) => f.valor > 0)
                  .map((f, i) => (
                    <SubRow key={i} label={f.label} value={`- ${currency(f.valor)}`} />
                  ))}
                {dre.promocoesTotal === 0 && <SubRow label="—" value={currency(0)} />}
              </DreRow>
              <DreRow
                label={`Imposto — Simples Nacional${dre.impostoPago ? " (pago)" : " (provisão)"}`}
                value={
                  dre.impostoPago
                    ? `- ${currency(dre.impostoDeduzido)}`
                    : `provisão · ${currency(dre.impostoProvisao)}`
                }
              >
                <SubRow
                  label={`Alíquota aplicada`}
                  value={`${dre.simplesAliquota.toFixed(2)}% sobre ${currency(dre.receitaBruta)}`}
                />
                <SubRow label="Provisão do período" value={currency(dre.impostoProvisao)} />
                {dre.impostoPago ? (
                  <SubRow label="Valor pago (abatido)" value={`- ${currency(dre.impostoDeduzido)}`} />
                ) : (
                  <SubRow
                    label="Status"
                    value="Aguardando comprovante — não abatido no lucro"
                  />
                )}
                {!dre.impostoPago && dre.impostoProvisao > 0 && (
                  <SubRow
                    label="Lucro líquido projetado (com imposto pago)"
                    value={currency(dre.lucroLiquidoProjetado)}
                  />
                )}
              </DreRow>
              <DreRow label="Lucro Líquido" value={currency(dre.lucroLiquido)} highlight />
            </Accordion>
          </section>

          {/* Motor de Custos IA — versão discreta */}
          <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Motor de Custos IA
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Notas fiscais & sobras
              </span>
            </div>

            <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
              <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Ler nota fiscal
                  </h4>
                  {scanning && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> lendo…
                    </span>
                  )}
                </div>

                <input
                  ref={scanCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    handleScanFiles(e.target.files);
                    if (scanCameraRef.current) scanCameraRef.current.value = "";
                  }}
                />
                <input
                  ref={scanUploadRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleScanFiles(e.target.files);
                    if (scanUploadRef.current) scanUploadRef.current.value = "";
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scanCameraRef.current?.click()}
                    disabled={scanning}
                    className="flex-1 h-9 gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Tirar foto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scanUploadRef.current?.click()}
                    disabled={scanning}
                    className="flex-1 h-9 gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Enviar imagem
                  </Button>
                </div>

                {scanMsg && (
                  <div
                    className={`mt-3 rounded-md px-3 py-2 text-xs ${
                      scanMsg.ok
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}
                  >
                    {scanMsg.text}
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Últimas notas lidas
                  </p>
                  {scannedNotes.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Nenhuma nota processada ainda.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {scannedNotes.map((n) => (
                        <li
                          key={n.at}
                          className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/60"
                        >
                          <img
                            src={n.preview}
                            alt=""
                            className="h-8 w-8 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400">
                            {n.summary}
                          </span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Apuração de sobras
                </h4>
                <Tabs defaultValue="refrigerados">
                  <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="refrigerados" className="text-xs">Refrigerados</TabsTrigger>
                    <TabsTrigger value="secos" className="text-xs">Secos</TabsTrigger>
                  </TabsList>

                  {[
                    { key: "refrigerados", list: refrigerados },
                    { key: "secos", list: secos },
                  ].map((tab) => (
                    <TabsContent key={tab.key} value={tab.key} className="mt-3">
                      <div className="space-y-1.5">
                        {tab.list.map((item) => (
                          <div
                            key={item.nome}
                            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-950"
                          >
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {item.nome}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                placeholder="0.0"
                                value={sobras[item.nome] ?? ""}
                                onChange={(e) =>
                                  setSobras((s) => ({
                                    ...s,
                                    [item.nome]: e.target.value,
                                  }))
                                }
                                className="h-8 w-20 text-right text-xs"
                              />
                              <span className="w-6 text-[11px] text-slate-400 dark:text-slate-500">
                                {item.unidade}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <Button variant="outline" size="sm" className="mt-4 w-full h-8 gap-2 text-xs">
                  <Calculator className="h-3.5 w-3.5" />
                  Calcular CMV com IA
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Edit Sheet */}
      <EditWeekSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={week}
        onSave={handleSave}
        periodLabel={rangeLabel}
      />

      {/* AI Chat Sheet — Cérebro */}
      <AiChatSheet
        open={aiOpen}
        onOpenChange={setAiOpen}
        week={week}
        onWeekChange={handleWeekChangeFromChat}
        periodLabel={rangeLabel}
      />
    </div>
  );
}
