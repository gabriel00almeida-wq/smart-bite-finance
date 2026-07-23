import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LineItem, WeekData } from "@/lib/dre-store";
import { SAMPLE_WEEK } from "@/lib/dre-store";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: WeekData;
  onSave: (data: WeekData) => void;
  periodLabel: string;
};

function NumberField({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {prefix}
        </span>
      )}
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        placeholder={placeholder ?? "0,00"}
        value={Number.isFinite(value) && value !== 0 ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={`h-9 text-right ${prefix ? "pl-8" : ""} ${suffix ? "pr-8" : ""}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function EditWeekSheet({ open, onOpenChange, initial, onSave, periodLabel }: Props) {
  const [data, setData] = useState<WeekData>(initial);

  useEffect(() => {
    if (open) setData(initial);
  }, [open, initial]);

  function updateFixo(i: number, patch: Partial<LineItem>) {
    setData((d) => ({
      ...d,
      fixos: d.fixos.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    }));
  }
  function removeFixo(i: number) {
    setData((d) => ({ ...d, fixos: d.fixos.filter((_, idx) => idx !== i) }));
  }
  function addFixo() {
    setData((d) => ({ ...d, fixos: [...d.fixos, { label: "Novo custo", valor: 0 }] }));
  }

  function updateMkt(i: number, patch: Partial<LineItem>) {
    setData((d) => ({
      ...d,
      marketing: d.marketing.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    }));
  }
  function removeMkt(i: number) {
    setData((d) => ({ ...d, marketing: d.marketing.filter((_, idx) => idx !== i) }));
  }
  function addMkt() {
    setData((d) => ({
      ...d,
      marketing: [...d.marketing, { label: "Novo investimento", valor: 0 }],
    }));
  }

  function updatePromo(i: number, patch: Partial<LineItem>) {
    setData((d) => ({
      ...d,
      promocoes: d.promocoes.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    }));
  }
  function removePromo(i: number) {
    setData((d) => ({ ...d, promocoes: d.promocoes.filter((_, idx) => idx !== i) }));
  }
  function addPromo() {
    setData((d) => ({
      ...d,
      promocoes: [...d.promocoes, { label: "Nova promoção", valor: 0 }],
    }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <SheetTitle>Editar apuração — {periodLabel}</SheetTitle>
          <SheetDescription>
            Preencha as receitas e custos da semana. A DRE, os KPIs e a análise IA usam esses
            dados.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Accordion type="multiple" defaultValue={["receitas", "variaveis", "cmv", "fixos", "mkt", "promo"]}>
            <AccordionItem value="receitas">
              <AccordionTrigger>Receitas por canal</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {data.channels.map((c, i) => (
                    <div
                      key={c.nome}
                      className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: c.color }}
                        />
                        <span className="text-sm font-medium">{c.nome}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-500">Faturamento</Label>
                          <NumberField
                            prefix="R$"
                            value={c.receita}
                            onChange={(v) =>
                              setData((d) => ({
                                ...d,
                                channels: d.channels.map((x, idx) =>
                                  idx === i ? { ...x, receita: v } : x,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Pedidos</Label>
                          <NumberField
                            value={c.pedidos}
                            onChange={(v) =>
                              setData((d) => ({
                                ...d,
                                channels: d.channels.map((x, idx) =>
                                  idx === i ? { ...x, pedidos: v } : x,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Taxas / comissão do app</Label>
                          <NumberField
                            prefix="R$"
                            value={c.taxas}
                            onChange={(v) =>
                              setData((d) => ({
                                ...d,
                                channels: d.channels.map((x, idx) =>
                                  idx === i ? { ...x, taxas: v } : x,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Descontos concedidos</Label>
                          <NumberField
                            prefix="R$"
                            value={c.descontos}
                            onChange={(v) =>
                              setData((d) => ({
                                ...d,
                                channels: d.channels.map((x, idx) =>
                                  idx === i ? { ...x, descontos: v } : x,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="variaveis">
              <AccordionTrigger>Custos variáveis</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-slate-500">Taxas de cartão / pagamento</Label>
                    <NumberField
                      prefix="R$"
                      value={data.taxaPagamento}
                      onChange={(v) => setData((d) => ({ ...d, taxaPagamento: v }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Embalagens</Label>
                    <NumberField
                      prefix="R$"
                      value={data.embalagens}
                      onChange={(v) => setData((d) => ({ ...d, embalagens: v }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Frete / entregador</Label>
                    <NumberField
                      prefix="R$"
                      value={data.freteEntregador}
                      onChange={(v) => setData((d) => ({ ...d, freteEntregador: v }))}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cmv">
              <AccordionTrigger>CMV — Insumos</AccordionTrigger>
              <AccordionContent>
                <Label className="text-xs text-slate-500">
                  Custo total de mercadorias vendidas na semana
                </Label>
                <NumberField
                  prefix="R$"
                  value={data.cmv}
                  onChange={(v) => setData((d) => ({ ...d, cmv: v }))}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Você também pode calcular pelo Motor de Custos IA (contagem de sobras) na tela
                  principal.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fixos">
              <AccordionTrigger>Custos fixos</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {data.fixos.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={f.label}
                        onChange={(e) => updateFixo(i, { label: e.target.value })}
                        className="h-9 flex-1"
                      />
                      <div className="w-32">
                        <NumberField
                          prefix="R$"
                          value={f.valor}
                          onChange={(v) => updateFixo(i, { valor: v })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-red-500"
                        onClick={() => removeFixo(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addFixo} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar linha
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mkt">
              <AccordionTrigger>Investimentos / Marketing</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {data.marketing.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={f.label}
                        onChange={(e) => updateMkt(i, { label: e.target.value })}
                        className="h-9 flex-1"
                      />
                      <div className="w-32">
                        <NumberField
                          prefix="R$"
                          value={f.valor}
                          onChange={(v) => updateMkt(i, { valor: v })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-red-500"
                        onClick={() => removeMkt(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addMkt} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar linha
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="promo">
              <AccordionTrigger>Promoções e Incentivos</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2 text-xs text-slate-500">
                  Cupons, cashback, frete grátis bancado pela casa, brindes.
                </p>
                <div className="space-y-2">
                  {data.promocoes.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={f.label}
                        onChange={(e) => updatePromo(i, { label: e.target.value })}
                        className="h-9 flex-1"
                      />
                      <div className="w-32">
                        <NumberField
                          prefix="R$"
                          value={f.valor}
                          onChange={(v) => updatePromo(i, { valor: v })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-red-500"
                        onClick={() => removePromo(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addPromo} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar linha
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button
            variant="ghost"
            size="sm"
            className="mt-4 text-xs text-indigo-600 hover:text-indigo-700"
            onClick={() => setData(SAMPLE_WEEK)}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Preencher com exemplo
          </Button>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => {
              onSave(data);
              onOpenChange(false);
            }}
          >
            Salvar apuração
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
