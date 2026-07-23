import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { analyzeDre, chatCerebro } from "@/lib/ai-analysis.functions";
import {
  applyPatch,
  computeDre,
  type WeekData,
  type WeekPatch,
} from "@/lib/dre-store";

type Msg = { role: "user" | "assistant"; content: string; images?: string[]; patchApplied?: boolean };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  week: WeekData;
  onWeekChange: (w: WeekData) => void;
  periodLabel: string;
};

const SUGGESTIONS = [
  "Vendi 12500 no iFood com 130 pedidos",
  "Gastei 800 em embalagens e 6500 de aluguel",
  "Faça uma análise completa da minha semana",
];

export function AiChatSheet({ open, onOpenChange, week, onWeekChange, periodLabel }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chat = useServerFn(chatCerebro);
  const analyze = useServerFn(analyzeDre);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    setError("");
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          currentWeek: week,
          periodo: periodLabel,
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
        onWeekChange(updated);
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content: res.reply || "Ok.",
          patchApplied: hasPatch,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao consultar a IA");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  async function runFullAnalysis() {
    const dre = computeDre(week);
    if (dre.receitaBruta <= 0) {
      setError("Preencha ao menos uma receita antes de pedir análise completa.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await analyze({
        data: {
          periodo: periodLabel,
          dre: {
            receitaBruta: dre.receitaBruta,
            custosVariaveis: dre.custosVariaveis,
            custosFixos: dre.fixosTotal + dre.marketingTotal,
            lucroLiquido: dre.lucroLiquido,
            margemContribuicao: +dre.margemContribuicaoPct.toFixed(2),
            cmv: +dre.cmvPct.toFixed(2),
            ticketMedio: +dre.ticketMedio.toFixed(2),
            canais: dre.canais.map((c) => ({ nome: c.nome, percentual: c.percentual })),
          },
        },
      });
      setMessages((m) => [
        ...m,
        { role: "user", content: "📊 Análise completa da DRE" },
        { role: "assistant", content: res.content },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao consultar a IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <SheetTitle className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <div>Cérebro Itadaki</div>
              <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                CEO IA · QI 200 — {periodLabel}
              </div>
            </div>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Diga o que aconteceu na semana ("vendi 12k no iFood", "aluguel foi 6500") e eu preencho
            a DRE. Também posso analisar seus números.
          </SheetDescription>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/60"
        >
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-lg bg-white p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                Olá 👋 Sou o cérebro financeiro do Itadaki. Manda os números da semana e eu
                atualizo sua DRE automaticamente. Ex:
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-800 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
                }`}
              >
                {m.role === "assistant" ? (
                  <article className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:mt-2 prose-headings:mb-1 dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </article>
                ) : (
                  m.content
                )}
                {m.patchApplied && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Sparkles className="h-3 w-3" />
                    DRE atualizada
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Pensando...
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={runFullAnalysis}
              disabled={loading}
              className="h-7 gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <Sparkles className="h-3 w-3" />
              Análise completa
            </Button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMessages([]);
                  setError("");
                }}
                className="h-7 text-xs text-slate-500"
              >
                Limpar
              </Button>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ex: vendi 8500 no iFood com 90 pedidos..."
              rows={2}
              className="min-h-[44px] resize-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="h-11 w-11 shrink-0 bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
