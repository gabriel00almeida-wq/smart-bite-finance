import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FileBarChart, Sparkles, Wallet, Plug } from "lucide-react";
import logoAsset from "@/assets/itadaki-logo.png.asset.json";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/", icon: FileBarChart, label: "DRE Completa" },
  { to: "/custos-fixos", icon: Wallet, label: "Custos Fixos" },
  { to: "/", icon: Sparkles, label: "Motor de Custos (IA)" },
  { to: "/", icon: Plug, label: "Integrações" },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
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
        {items.map((item, idx) => {
          const active = item.to === pathname || (item.to === "/" && idx === 0 && pathname === "/");
          return (
            <Link
              key={idx}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-6 py-6 text-xs text-slate-500">v1.0 · Julho 2026</div>
    </aside>
  );
}
