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

// IA do Lovable (gateway OpenAI-compatible). Gemini 3.6 Flash lê texto e imagens.
const GROQ_VISION_MODEL = "google/gemini-3.6-flash";
const GROQ_TEXT_MODEL = "google/gemini-3.6-flash";

async function callGateway(body: Record<string, unknown>) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    // Sem mensagens genéricas: expõe o erro técnico exato do provedor
    throw new Error(`[Lovable AI HTTP ${res.status} ${res.statusText}]\n${txt}`);
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
      model: GROQ_TEXT_MODEL,

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
2. Extrair dados numéricos da mensagem do usuário e devolver um PATCH para atualizar a DRE.

IMPORTANTE — VALORES SEMPRE EM REAIS (R$), NUNCA CALCULE PERCENTUAIS NEM ESTIME:
- O usuário informa DIRETAMENTE o faturamento, taxas do app, descontos, taxa de cartão, etc. em R$.
- NÃO estime taxas, comissões, taxa de cartão/pagamento ou qualquer custo aplicando percentuais "de mercado" (ex.: 2,5% de cartão, 27% do iFood). Só registre o R$ que ele disser textualmente ou que aparecer nas imagens.
- Se ele não informou um valor, NÃO invente, NÃO preencha e NÃO inclua no patch. Peça o número no reply.

SIMPLES NACIONAL:
- O usuário pode informar a alíquota do Simples (ex.: "meu Simples é 6%") → use "simplesAliquota".
- O imposto NUNCA abate no lucro automaticamente. Só marque "impostoPago: true" se o usuário DISSER que pagou ("paguei o DAS", "pago", "comprovante em anexo") OU se ele anexar imagem/print do comprovante de pagamento (DAS, PIX, boleto pago).
- Se o comprovante estiver anexado, marque "impostoPago: true" e, se conseguir ler o valor no comprovante, use "impostoPagoValor" em R$.

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
    "promocoes": [{ "label": string, "valor": number }],
    "simplesAliquota"?: number,
    "impostoPago"?: boolean,
    "impostoPagoValor"?: number,
    "estoqueValor"?: number,
    "rateiosMensais": [{
      "label": string,
      "valorMensal": number,
      "categoria": "fixo" | "marketing"
    }]
  }
}

Regras do patch:
- Só inclua CAMPOS que o usuário mencionou. Se não mencionou, OMITA (não use 0).
- Valores em REAIS (number), sem "R$". NUNCA em percentual (exceto "simplesAliquota" que é %).
- CUSTOS SÃO INCREMENTAIS: "cmv", "embalagens", "freteEntregador", "taxaPagamento", "fixos", "marketing", "promocoes" — cada mensagem SOMA no total da semana. Ex.: se o usuário diz "gastei 140 no hortifruti", envie cmv: 140 (não o total acumulado). Se depois disser "mais 79 de hortifruti", envie cmv: 79 de novo — o sistema soma.
- Para "fixos" / "marketing" / "promocoes", use o label mais próximo do que o usuário disse (ex: "Aluguel", "Sem Limite", "Hortifruti"). Se o label já existe, o valor será somado; se não, será criado.
- RECEITAS por canal ("channels") são TOTAIS do canal na semana (substituem valores anteriores), pois vêm de prints do painel de cada app.
- "promocoes" = cupons, cashback, frete grátis bancado pela casa, brindes.
- "marketing" = mídia paga (ads iFood, Meta, Google, influenciadores).
- "fixos" = custos fixos (aluguel, folha, energia, etc.).
- RATEIO MENSAL: quando o usuário disser "por mês", "mensal", "rateie nos dias do mês", "rateio em 31 dias" ou pedir para distribuir até dezembro, NÃO envie o valor inteiro em "fixos" ou "marketing". Envie em "rateiosMensais". O sistema fará o rateio exato por dia de cada mês, desde o início do período selecionado até 31 de dezembro do mesmo ano.
- Classifique folha salarial, aluguel, energia, equipamentos, investimentos e compras de bens (ex.: geladeira nova) como categoria "fixo". Classifique mídia, anúncios, influenciadores e verba de marketing como "marketing".
- Em "rateiosMensais", "valorMensal" é o valor integral de UMA competência mensal. Não divida por 31 e não multiplique pelos meses; o sistema calcula isso.
- Se o usuário só quer conversar, devolva "patch": {}.
- NUNCA invente dados.
- Se o usuário enviar IMAGENS (prints de painel, notas fiscais, comprovantes), LEIA os números visíveis e extraia. Se for comprovante de DAS/imposto, marque impostoPago: true.
- SOBRA DE ESTOQUE: se o usuário disser algo como "sobrou R$ 500 em estoque", "ficou 300 de insumo no estoque", "inventário final: 800", "estoque de fechamento 1200" → use "estoqueValor" com o valor em R$. Esse campo é o VALOR TOTAL que ficou em estoque na semana (substitui o anterior, não soma). Ele abate no CMV Real.

Exemplos:
Usuário: "meu Simples é 6%"
→ { "reply": "Alíquota do Simples registrada em 6%. Vou provisionar mas só abato no lucro quando você anexar o comprovante do DAS.", "patch": { "simplesAliquota": 6 } }

Usuário (com print do DAS pago): "paguei o DAS, segue"
→ { "reply": "Comprovante do DAS recebido — R$ X registrado como pago e abatido no lucro líquido.", "patch": { "impostoPago": true, "impostoPagoValor": X } }

Usuário: "Rateie R$ 6.200 de folha nos dias do mês até dezembro"
→ { "reply": "Folha mensal de R$ 6.200 será rateada por dia até dezembro.", "patch": { "rateiosMensais": [{ "label": "Folha salarial", "valorMensal": 6200, "categoria": "fixo" }] } }`;


export const chatCerebro = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatSchema.parse(data))
  .handler(async ({ data }) => {
    const contextMsg = `Período atual: ${data.periodo}
DRE atual (JSON):
${JSON.stringify(data.currentWeek, null, 2)}`;

    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${contextMsg}` },
    ];

    let hasImages = false;
    for (const m of data.messages) {
      if (m.role === "user" && m.images?.length) {
        hasImages = true;
        const parts: Array<Record<string, unknown>> = [
          { type: "text", text: m.content || "(imagem em anexo)" },
        ];
        for (const url of m.images) {
          parts.push({ type: "image_url", image_url: { url } });
        }
        messages.push({ role: "user", content: parts });
      } else {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const json = await callGateway({
      model: hasImages ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
      messages,
      response_format: { type: "json_object" },
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
