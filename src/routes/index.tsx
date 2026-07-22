import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DRE Delivery — Gestão Financeira para Restaurantes" },
      {
        name: "description",
        content:
          "Painel de DRE e gestão financeira para delivery de restaurantes: KPIs, CMV, margem e motor de custos com IA.",
      },
      { property: "og:title", content: "DRE Delivery — Gestão Financeira" },
      {
        property: "og:description",
        content:
          "Controle margem, CMV, canais e lucro líquido do seu delivery em um só lugar.",
      },
    ],
  }),
  component: Dashboard,
});

const revenueData = [
  { mes: "Fev", Receita: 68000, Custos: 52000 },
  { mes: "Mar", Receita: 74500, Custos: 55800 },
  { mes: "Abr", Receita: 71200, Custos: 54200 },
  { mes: "Mai", Receita: 82300, Custos: 60100 },
  { mes: "Jun", Receita: 88900, Custos: 63400 },
  { mes: "Jul", Receita: 95200, Custos: 66500 },
];

const channelData = [
  { name: "iFood", value: 45, color: "#EA1D2C" },
  { name: "99Food", value: 25, color: "#FFD100" },
  { name: "Anotai", value: 30, color: "#22C55E" },
];

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

const notasLidas = [
  "NF 8842 — Atacadão Distribuidora",
  "NF 1207 — Peixaria Central",
  "NF 5591 — Embalagens SP",
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
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              good
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {trendUp ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
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
        className={`flex items-center justify-between border-b border-slate-100 px-5 py-4 ${
          highlight
            ? "bg-emerald-50/60 font-semibold text-emerald-800"
            : muted
              ? "text-slate-600"
              : "text-slate-800"
        }`}
      >
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
    );
  }
  return (
    <AccordionItem value={label} className="border-b border-slate-100">
      <AccordionTrigger className="px-5 py-4 hover:no-underline">
        <div className="flex w-full items-center justify-between pr-2">
          <span className="font-medium text-slate-800">{label}</span>
          <span className="font-mono tabular-nums text-slate-900">{value}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-slate-50/60 px-5 pb-3 pt-1">
        <div className="divide-y divide-slate-200/70">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm text-slate-600">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function Dashboard() {
  const [sobras, setSobras] = useState<Record<string, string>>({});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 text-slate-200 lg:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-900">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Prato Certo</div>
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
        <div className="mt-auto px-6 py-6 text-xs text-slate-500">
          v1.0 · Julho 2026
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              Dashboard Financeiro
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Visão consolidada dos canais de delivery
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Select defaultValue="jul-26">
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mai-26">Maio 2026</SelectItem>
                <SelectItem value="jun-26">Junho 2026</SelectItem>
                <SelectItem value="jul-26">Julho 2026</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="hidden sm:inline-flex">
              <Download className="mr-2 h-4 w-4" />
              Exportar Relatório
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-emerald-100 text-emerald-800">
                RC
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          {/* KPIs */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Margem de Contribuição"
              value="18.5%"
              icon={Percent}
              trend
              trendUp
              trendLabel="+2% vs último mês"
            />
            <KpiCard
              title="CMV Real"
              value="31.2%"
              icon={Receipt}
              trend
              trendUp={false}
              trendLabel="-1.4% vs último mês"
            />
            <KpiCard
              title="Lucro Líquido"
              value="R$ 12.450,00"
              icon={DollarSign}
              trend
              trendUp
              trendLabel="+8.2% vs último mês"
            />
            <KpiCard
              title="Ticket Médio"
              value="R$ 95,50"
              icon={TrendingUp}
              trend
              trendUp
              trendLabel="+R$ 4,10"
            />
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Receita vs Custos
                  </h3>
                  <p className="text-xs text-slate-500">Últimos 6 meses</p>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  BRL
                </Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="mes" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${v / 1000}k`}
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

            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">
                  Vendas por Canal
                </h3>
                <p className="text-xs text-slate-500">Distribuição mensal</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {channelData.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2">
                {channelData.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-700">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                    <span className="font-medium text-slate-900">{c.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* DRE */}
          <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  DRE — Demonstração do Resultado
                </h3>
                <p className="text-xs text-slate-500">
                  Clique nas linhas para expandir os detalhes
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
            <Accordion type="multiple" defaultValue={["Receita Bruta Total", "Custos Variáveis"]}>
              <DreRow label="Receita Bruta Total" value={currency(95200)}>
                <SubRow label="iFood (45%)" value={currency(42840)} />
                <SubRow label="99Food (25%)" value={currency(23800)} />
                <SubRow label="Anotai (30%)" value={currency(28560)} />
              </DreRow>
              <DreRow label="Custos Variáveis" value={`- ${currency(66500)}`}>
                <SubRow label="CMV (Insumos)" value={`- ${currency(29702)}`} />
                <SubRow label="Embalagens" value={`- ${currency(4285)}`} />
                <SubRow label="Taxas iFood" value={`- ${currency(10710)}`} />
                <SubRow label="Taxas 99Food" value={`- ${currency(5236)}`} />
                <SubRow label="Taxas Cartão Anotai" value={`- ${currency(2856)}`} />
              </DreRow>
              <DreRow label="Margem de Contribuição" value="18.5%" />
              <DreRow label="Custos Fixos" value={`- ${currency(16250)}`}>
                <SubRow label="Aluguel" value={`- ${currency(6500)}`} />
                <SubRow label="Folha de Pagamento" value={`- ${currency(7800)}`} />
                <SubRow label="Utilidades" value={`- ${currency(1950)}`} />
              </DreRow>
              <DreRow label="Lucro Líquido" value={currency(12450)} highlight />
            </Accordion>
          </section>

          {/* Motor de Custos IA */}
          <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Motor de Custos IA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload de notas + apuração automática de CMV
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
              {/* Left: uploads */}
              <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  Entrada de Notas
                </h4>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40">
                  <UploadCloud className="h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Arraste as fotos das notas fiscais
                  </p>
                  <p className="text-xs text-slate-500">
                    ou clique para fazer upload (JPG, PNG, PDF)
                  </p>
                  <input type="file" className="hidden" multiple />
                </label>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Últimas notas lidas pela IA
                  </p>
                  <ul className="space-y-2">
                    {notasLidas.map((n) => (
                      <li
                        key={n}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          {n}
                        </span>
                        <span className="text-xs text-slate-400">OK</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: sobras */}
              <div className="p-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  Apuração de Sobras
                </h4>
                <Tabs defaultValue="refrigerados">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="refrigerados">Refrigerados</TabsTrigger>
                    <TabsTrigger value="secos">Secos</TabsTrigger>
                  </TabsList>

                  {[
                    { key: "refrigerados", list: refrigerados },
                    { key: "secos", list: secos },
                  ].map((tab) => (
                    <TabsContent key={tab.key} value={tab.key} className="mt-4">
                      <div className="space-y-2">
                        {tab.list.map((item) => (
                          <div
                            key={item.nome}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <span className="text-sm font-medium text-slate-700">
                              {item.nome}
                            </span>
                            <div className="flex items-center gap-2">
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
                                className="h-9 w-24 text-right"
                              />
                              <span className="w-8 text-xs text-slate-500">
                                {item.unidade}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <Button className="mt-5 w-full bg-blue-600 text-white hover:bg-blue-700">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular CMV com IA
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
