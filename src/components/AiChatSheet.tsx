import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, CalendarDays, Camera, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { analyzeDre, chatCerebro } from "@/lib/ai-analysis.functions";
import { computeDre, type WeekData, type WeekPatch } from "@/lib/dre-store";

type Msg = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  patchApplied?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  week: WeekData;
  /** Aplica o patch na semana da data escolhida pelo usuário. */
  onPatch: (patch: WeekPatch, meta: { note: string; targetDate: Date }) => boolean;
  periodLabel: string;
  /** Data sugerida no seletor (início do período selecionado). */
  defaultDate?: Date;
};

const SUGGESTIONS = [
  "Vendi 12500 no iFood com 130 pedidos",
  "Gastei 800 em embalagens e 6500 de aluguel",
  "Rateie 6500 de aluguel por mês até dezembro",
  "Faça uma análise completa da minha semana",
];

function rawErrorText(e: unknown): string {
  if (e instanceof Error) {
    return [e.name ? `${e.name}: ${e.message}` : e.message, e.stack].filter(Boolean).join("\n");
  }
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}

export function AiChatSheet({
  open,
  onOpenChange,
  week,
  onPatch,
  periodLabel,
  defaultDate,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Data do lançamento — confirmada numa caixinha a cada mensagem enviada
  const [entryDate, setEntryDate] = useState<Date>(() => defaultDate ?? new Date());
  const [askDate, setAskDate] = useState<{ text: string; images: string[] } | null>(null);

  const chat = useServerFn(chatCerebro);
  const analyze = useServerFn(analyzeDre);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, 4);
    const dataUrls = await Promise.all(
      arr.map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            if (!f.type.startsWith("image/")) {
              reject(new Error("Apenas imagens são suportadas."));
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
    ).catch((e) => {
      setError(e instanceof Error ? e.message : "Erro ao ler imagem");
      return [] as string[];
    });
    if (dataUrls.length) setPendingImages((p) => [...p, ...dataUrls].slice(0, 4));
  }

  /** Abre a caixinha de data antes de enviar a mensagem. */
  function requestSend(text: string) {
    const clean = text.trim();
    if ((!clean && pendingImages.length === 0) || loading) return;
    setAskDate({ text: clean, images: pendingImages });
  }

  async function send(text: string, images: string[], targetDate: Date) {
    const clean = text.trim();
    if ((!clean && images.length === 0) || loading) return;
    setError("");
    const dateLabel = format(targetDate, "dd MMM yyyy", { locale: ptBR });
    const next: Msg[] = [
      ...messages,
      { role: "user", content: clean, images: images.length ? images : undefined },
    ];
    setMessages(next);
    setInput("");
    setPendingImages([]);
    setLoading(true);
    try {
      const res = await chat({
        data: {
          messages: next.map((m, i) => ({
            role: m.role,
            content:
              i === next.length - 1 && m.role === "user"
                ? `${m.content}\n\n(Data do lançamento informada pelo usuário: ${dateLabel})`
                : m.content,
            ...(m.images && m.images.length ? { images: m.images } : {}),
          })),
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
      let patchApplied = false;
      if (hasPatch) {
        if (patch.impostoPago && images.length > 0 && !patch.impostoComprovanteUrl) {
          patch.impostoComprovanteUrl = images[0];
          patch.impostoPagoEm = new Date().toISOString();
        }
        patchApplied = onPatch(patch, {
          note: `${clean || "(imagem)"} · lançado em ${dateLabel}`,
          targetDate,
        });
        if (!patchApplied) {
          setError("Não foi possível registrar o lançamento nessa data.");
        }
      }

      setMessages([
        ...next,
        {
          role: "assistant",
          content: res.reply || "Ok.",
          patchApplied,
        },
      ]);
    } catch (e) {
      setError(rawErrorText(e));
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
            cmv: +dre.cmvRealPct.toFixed(2),
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
      setError(rawErrorText(e));
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
            Informe receitas, custos ou contas mensais. Posso ratear folha, aluguel, marketing e
            investimentos por dia até dezembro, além de analisar seus números.
          </SheetDescription>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/60"
        >
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-lg bg-white p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                Olá 👋 Sou o cérebro financeiro do Itadaki. Envie números da semana ou contas
                mensais para ratear até dezembro. Ex:
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => requestSend(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-800 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
                }`}
              >
                {m.images && m.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {m.images.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt=""
                        className="h-24 w-24 rounded-md object-cover ring-1 ring-white/30"
                      />
                    ))}
                  </div>
                )}
                {m.role === "assistant" ? (
                  <article className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:mt-2 prose-headings:mb-1 dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </article>
                ) : (
                  m.content || <span className="italic opacity-70">imagem enviada</span>
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
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-red-200 bg-red-50 p-3 font-mono text-[11px] leading-relaxed text-red-700 select-text dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </pre>
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
          {pendingImages.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingImages.map((src, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="h-16 w-16 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingImages((p) => p.filter((_, i) => i !== idx))}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white shadow hover:bg-slate-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestSend(input);
            }}
            className="flex items-end gap-2"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                if (cameraRef.current) cameraRef.current.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => cameraRef.current?.click()}
              disabled={loading || pendingImages.length >= 4}
              className="h-11 w-11 shrink-0"
              title="Tirar foto"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={loading || pendingImages.length >= 4}
              className="h-11 w-11 shrink-0"
              title="Anexar imagem"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  requestSend(input);
                }
              }}
              placeholder="Ex: vendi 8500 no iFood com 90 pedidos... ou anexe um print"
              rows={2}
              className="min-h-[44px] resize-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || (!input.trim() && pendingImages.length === 0)}
              className="h-11 w-11 shrink-0 bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
            <CalendarDays className="h-3 w-3" />
            Ao enviar, você escolhe a data do lançamento.
          </p>
        </div>
      </SheetContent>

      {/* Caixinha de data — confirma o dia do lançamento antes de acionar o Cérebro */}
      <Dialog open={!!askDate} onOpenChange={(o) => !o && setAskDate(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Data do lançamento</DialogTitle>
            <DialogDescription className="text-xs">
              Escolha o dia em que essas entradas/despesas devem ser registradas. O Cérebro grava na
              semana correspondente.
            </DialogDescription>
          </DialogHeader>
          <Calendar
            mode="single"
            locale={ptBR}
            selected={entryDate}
            onSelect={(d) => d && setEntryDate(d)}
            className="pointer-events-auto rounded-md border border-slate-200 p-2 dark:border-slate-800"
          />
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setAskDate(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                const payload = askDate;
                setAskDate(null);
                if (payload) void send(payload.text, payload.images, entryDate);
              }}
            >
              Lançar em {format(entryDate, "dd MMM", { locale: ptBR })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
