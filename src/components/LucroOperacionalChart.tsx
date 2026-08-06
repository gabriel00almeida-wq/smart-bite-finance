import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type LucroOperacionalPoint = {
  periodo: string;
  faturamento: number;
  lucroOperacional: number;
};

const PISO = 15;
const TETO = 20;
const ALVO = 17.5;

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const MOCK: LucroOperacionalPoint[] = [
  { periodo: "Semana 1", faturamento: 42000, lucroOperacional: 6720 },
  { periodo: "Semana 2", faturamento: 38500, lucroOperacional: 5005 },
  { periodo: "Semana 3", faturamento: 45200, lucroOperacional: 8588 },
  { periodo: "Semana 4", faturamento: 41000, lucroOperacional: 7175 },
];

function colorFor(margem: number) {
  if (margem >= PISO && margem <= TETO) return "#1e3a8a"; // azul marinho
  if (margem > TETO) return "#10b981";
  if (margem >= PISO - 5) return "#eab308";
  return "#ef4444";
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as LucroOperacionalPoint & { margem: number };
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-xl">
      <p className="mb-1 font-semibold text-white">{label}</p>
      <p>Faturamento: {currency(p.faturamento)}</p>
      <p>Lucro operacional: {currency(p.lucroOperacional)}</p>
      <p className="mt-1 font-semibold" style={{ color: colorFor(p.margem) }}>
        Margem operacional: {p.margem.toFixed(1)}%
      </p>
    </div>
  );
}

export default function LucroOperacionalChart({
  data,
}: {
  data?: LucroOperacionalPoint[];
}) {
  const rows = useMemo(() => {
    const base = data && data.length > 0 ? data : MOCK;
    return base.map((d) => ({
      ...d,
      margem: d.faturamento > 0 ? (d.lucroOperacional / d.faturamento) * 100 : 0,
    }));
  }, [data]);

  const totals = useMemo(() => {
    const fat = rows.reduce((s, r) => s + r.faturamento, 0);
    const lucro = rows.reduce((s, r) => s + r.lucroOperacional, 0);
    return { fat, lucro, margem: fat > 0 ? (lucro / fat) * 100 : 0 };
  }, [rows]);

  const status =
    totals.margem >= PISO && totals.margem <= TETO
      ? { label: `Dentro da meta — ${totals.margem.toFixed(1)}%`, cls: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30" }
      : totals.margem > TETO
        ? { label: `Acima do teto — ${totals.margem.toFixed(1)}%`, cls: "bg-sky-500/15 text-sky-400 ring-sky-500/30" }
        : { label: `Abaixo da meta — ${totals.margem.toFixed(1)}%`, cls: "bg-amber-500/15 text-amber-400 ring-amber-500/30" };

  return (
    <section className="rounded-xl bg-slate-900 p-5 text-slate-100 shadow-sm ring-1 ring-slate-800">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Acompanhamento de Lucro Operacional</h3>
          <p className="text-xs text-slate-400">Meta de Margem Operacional: 15% a 20%</p>
        </div>
        <Badge className={`w-fit gap-1 rounded-full border-0 ring-1 ${status.cls}`}>
          <Target className="h-3 w-3" />
          {status.label}
        </Badge>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="periodo"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 25]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#475569"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceArea
              yAxisId="left"
              y1={PISO}
              y2={TETO}
              fill="#3b82f6"
              fillOpacity={0.1}
            />
            <ReferenceLine
              yAxisId="left"
              y={PISO}
              stroke="#eab308"
              strokeDasharray="6 4"
              label={{ value: "Piso 15%", position: "insideBottomLeft", fill: "#eab308", fontSize: 10 }}
            />
            <ReferenceLine
              yAxisId="left"
              y={TETO}
              stroke="#10b981"
              strokeDasharray="6 4"
              label={{ value: "Teto 20%", position: "insideTopLeft", fill: "#10b981", fontSize: 10 }}
            />
            <ReferenceLine
              yAxisId="left"
              y={ALVO}
              stroke="#3b82f6"
              strokeDasharray="2 6"
            />
            <Bar
              yAxisId="right"
              dataKey="faturamento"
              name="Faturamento (R$)"
              fill="#1e293b"
              radius={[4, 4, 0, 0]}
              barSize={26}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="margem"
              name="Margem realizada (%)"
              stroke="#1e3a8a"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={colorFor(payload.margem)}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-800/60 p-3 ring-1 ring-slate-700/60">
          <p className="text-[11px] text-slate-400">Faturamento acumulado</p>
          <p className="mt-1 text-lg font-semibold text-white">{currency(totals.fat)}</p>
        </div>
        <div className="rounded-lg bg-slate-800/60 p-3 ring-1 ring-slate-700/60">
          <p className="text-[11px] text-slate-400">Lucro operacional acumulado</p>
          <p className="mt-1 text-lg font-semibold text-white">{currency(totals.lucro)}</p>
        </div>
        <div className="rounded-lg bg-slate-800/60 p-3 ring-1 ring-slate-700/60">
          <p className="text-[11px] text-slate-400">Margem operacional média</p>
          <p
            className="mt-1 flex items-center gap-1 text-lg font-semibold"
            style={{ color: colorFor(totals.margem) }}
          >
            {totals.margem >= PISO ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {totals.margem.toFixed(1)}%
          </p>
        </div>
      </div>
    </section>
  );
}
