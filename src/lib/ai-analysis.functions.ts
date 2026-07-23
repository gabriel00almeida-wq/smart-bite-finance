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

REGRAS RÍGIDAS SOBRE NÚMEROS (não quebre nunca):
- Use SOMENTE os valores presentes no JSON abaixo. NÃO invente, NÃO estime, NÃO aplique percentuais "de mercado" (ex.: "taxa de cartão em torno de 2,5%", "iFood cobra ~27%", "CMV típico de 30%"). Se um valor não está no JSON, trate como ZERO e liste como "dado faltando" na seção 5.
- NÃO calcule taxas, comissões, CMV ou qualquer custo multiplicando o faturamento por um percentual sugerido por você. Só cite valores em R$ que já vieram no JSON.
- Percentuais só podem aparecer se forem derivados por divisão entre dois números que estão no JSON (ex.: cmv / receita). Nunca cite um percentual "estimado".

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

IMPORTANTE — VALORES SEMPRE EM REAIS (R$), NUNCA CALCULE PERCENTUAIS NEM ESTIME:
- O usuário informa DIRETAMENTE o faturamento, taxas do app, descontos, taxa de cartão, etc. em R$.
- NÃO estime taxas, comissões, taxa de cartão/pagamento ou qualquer custo aplicando percentuais "de mercado" (ex.: 2,5% de cartão, 27% do iFood). Só registre o R$ que ele disser textualmente ou que aparecer nas imagens.
- Se ele não informou um valor, NÃO invente, NÃO preencha e NÃO inclua no patch. Peça o número no reply.
- Se ele disser "iFood faturei 12500, o app cobrou 3200 de taxa e 500 de desconto", você registra receita=12500, taxas=3200, descontos=500.

Você DEVE responder SEMPRE em JSON puro, sem markdown, sem cercas, no formato:
{
  "reply": "sua resposta em português, curta e útil (pode usar markdown leve)",
  "patch": {
    "channels": [{
      "nome": "iFood" | "99Food" | "Anotai" | "Próprio / WhatsApp" | "Salão",
      "receita"?: number,
      "pedidos"?: number,
      "taxas"?: number,
      "descontos"?: number
    }],
    "embalagens"?: number,
    "freteEntregador"?: number,
    "cmv"?: number,
    "taxaPagamento"?: number,
    "totalPedidosOverride"?: number,
    "fixos": [{ "label": string, "valor": number }],
    "marketing": [{ "label": string, "valor": number }],
    "promocoes": [{ "label": string, "valor": number }]
  }
}


Regras do patch:
- Só inclua CAMPOS que o usuário mencionou. Se não mencionou, OMITA (não use 0).
- "channels", "fixos", "marketing" e "promocoes" são arrays de itens a fazer merge por nome/label. Só inclua os itens citados.
- Valores em REAIS (number), sem "R$". NUNCA em percentual.
- "promocoes" é para cupons, cashback, frete grátis bancado pela casa, brindes, incentivos.
- "marketing" é para mídia paga (ads iFood, Meta, Google, influenciadores).
- "fixos" é para custos fixos (aluguel, folha, energia, etc.).
- Se o usuário só quer conversar (perguntou algo, pediu análise), devolva "patch": {}.
- NUNCA invente dados. Só extraia o que foi dito.
- Se o usuário enviar IMAGENS (prints de painel iFood/99Food, notas fiscais, planilhas, fotos de recibos), LEIA os números visíveis nelas e extraia para o patch da mesma forma. Cite no reply o que você conseguiu ler.

Exemplos:
Usuário: "iFood: fatura 12500, 130 pedidos, taxa do app 3125, desconto 400"
→ { "reply": "Anotado no iFood: faturamento R$ 12.500 (130 pedidos), taxa R$ 3.125, descontos R$ 400.", "patch": { "channels": [{"nome":"iFood","receita":12500,"pedidos":130,"taxas":3125,"descontos":400}] } }

Usuário: "gastei 600 em cupom e 300 em cashback"
→ { "reply": "Registrei R$ 600 em cupom e R$ 300 em cashback nas promoções.", "patch": { "promocoes": [{"label":"Cupom","valor":600},{"label":"Cashback","valor":300}] } }

Usuário: "aluguel 6500, taxa de cartão foi 320"
→ { "reply": "Registrei aluguel R$ 6.500 e R$ 320 em taxa de cartão.", "patch": { "taxaPagamento": 320, "fixos": [{"label":"Aluguel","valor":6500}] } }

Usuário: "como está minha margem?"
→ { "reply": "Sua margem de contribuição está em X% ... [análise]", "patch": {} }`;


export const chatCerebro = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatSchema.parse(data))
  .handler(async ({ data }) => {
    const contextMsg = `Período atual: ${data.periodo}
DRE atual (JSON):
${JSON.stringify(data.currentWeek, null, 2)}`;

    const gatewayMessages = data.messages.map((m) => {
      if (m.role === "user" && m.images && m.images.length > 0) {
        return {
          role: "user" as const,
          content: [
            { type: "text", text: m.content || "(imagem em anexo)" },
            ...m.images.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const json = await callGateway({
      model: "google/gemini-3.6-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: contextMsg },
        ...gatewayMessages,
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
