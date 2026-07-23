import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Analysis (existing) ----------

const AnalyzeSchema = z.object({
  periodo: z.string(),
  dre: z.object({
    receitaBruta: z.number(),
    custosVariaveis: z.number(),
    custosFixos: z.number(),
    lucroLiquido: z.number(),
    margemContribuicao: z.number(),
    cmv: z.number(),
    ticketMedio: z.number(),
    canais: z.array(z.object({ nome: z.string(), percentual: z.number() })),
  }),
});

async function callGateway(body: unknown) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Limite de requisições atingido. Tente em alguns segundos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
    throw new Error(`AI Gateway ${res.status}: ${txt}`);
  }
  return res.json();
}

export const analyzeDre = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AnalyzeSchema.parse(data))
  .handler(async ({ data }) => {
    const prompt = `Você é um CEO com QI 200 especializado em finanças de restaurantes delivery.
Analise a DRE abaixo do período ${data.periodo} e retorne um parecer em português (markdown) com:

1. **Diagnóstico rápido** (2-3 linhas)
2. **Pontos fortes** (bullets)
3. **Alertas críticos** (bullets, com números)
4. **Lacunas exploráveis** — oportunidades escondidas e canais subaproveitados
5. **Dados que faltam** — o que o gestor deveria começar a coletar
6. **3 ações prioritárias para a próxima semana** (numeradas, específicas)

Seja incisivo, direto, use números. Nada de generalidades.

DADOS:
${JSON.stringify(data.dre, null, 2)}`;

    const json = await callGateway({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: "Você é um CEO especialista em finanças de food service." },
        { role: "user", content: prompt },
      ],
    });
    const content: string = json.choices?.[0]?.message?.content ?? "Sem resposta.";
    return { content };
  });

// ---------- Chat "cérebro" — extrai dados e conversa ----------

const ChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      images: z.array(z.string()).optional(),
    }),
  ),
  currentWeek: z.any(),
  periodo: z.string(),
});


const SYSTEM_PROMPT = `Você é o "Cérebro Itadaki" — assistente financeiro de um restaurante delivery de sushi.
Sua função é DUPLA:
1. Conversar como um CEO experiente (dar insights, apontar lacunas, sugerir ações).
2. Extrair dados numéricos da mensagem do usuário e devolver um PATCH para atualizar a DRE da semana.

Você DEVE responder SEMPRE em JSON puro, sem markdown, sem cercas, no formato:
{
  "reply": "sua resposta em português, curta e útil (pode usar markdown leve)",
  "patch": {
    "channels": [{ "nome": "iFood" | "99Food" | "Anotai" | "Próprio / WhatsApp" | "Salão", "receita"?: number, "pedidos"?: number, "taxaPct"?: number }],
    "embalagens"?: number,
    "freteEntregador"?: number,
    "cmv"?: number,
    "taxaPagamentoPct"?: number,
    "fixos": [{ "label": string, "valor": number }],
    "marketing": [{ "label": string, "valor": number }]
  }
}

Regras do patch:
- Só inclua CAMPOS que o usuário mencionou. Se não mencionou, OMITA (não use 0).
- "channels", "fixos" e "marketing" são arrays de itens a fazer merge por nome/label. Só inclua os itens citados.
- Valores em REAIS (number), sem "R$". Percentuais em número (ex: 25 = 25%).
- Para custos fixos novos, use label descritivo curto ("Aluguel", "Folha", "Energia").
- Se o usuário só quer conversar (perguntou algo, pediu análise), devolva "patch": {}.
- NUNCA invente dados. Só extraia o que foi dito.

Exemplos:
Usuário: "vendi 12500 no ifood com 130 pedidos"
→ { "reply": "Anotado: R$ 12.500 no iFood em 130 pedidos (ticket médio ~R$ 96).", "patch": { "channels": [{"nome":"iFood","receita":12500,"pedidos":130}] } }

Usuário: "gastei 800 em embalagens e 6500 de aluguel"
→ { "reply": "Registrei R$ 800 em embalagens e R$ 6.500 de aluguel.", "patch": { "embalagens": 800, "fixos": [{"label":"Aluguel","valor":6500}] } }

Usuário: "como está minha margem?"
→ { "reply": "Sua margem de contribuição está em X% ... [análise]", "patch": {} }`;

export const chatCerebro = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatSchema.parse(data))
  .handler(async ({ data }) => {
    const contextMsg = `Período atual: ${data.periodo}
DRE atual (JSON):
${JSON.stringify(data.currentWeek, null, 2)}`;

    const json = await callGateway({
      model: "google/gemini-3.6-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: contextMsg },
        ...data.messages,
      ],
    });

    const raw: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { reply?: string; patch?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { reply: raw, patch: {} };
      }
    }
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
      patchJson: JSON.stringify(parsed.patch ?? {}),
    };
  });
