import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
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

export const analyzeDre = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const prompt = `Você é um CEO com QI 200 especializado em finanças de restaurantes delivery.
Analise a DRE abaixo do período ${data.periodo} e retorne um parecer em português (markdown) com:

1. **Diagnóstico rápido** (2-3 linhas)
2. **Pontos fortes** (bullets)
3. **Alertas críticos** (bullets, com números)
4. **Lacunas exploráveis** — oportunidades escondidas e canais subaproveitados
5. **Dados que faltam** — o que o gestor deveria começar a coletar para enriquecer a DRE (ex: CAC por canal, LTV, drop-off, food cost por prato, etc.)
6. **3 ações prioritárias para a próxima semana** (numeradas, específicas)

Seja incisivo, direto, use números. Nada de generalidades.

DADOS:
${JSON.stringify(data.dre, null, 2)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: "Você é um CEO especialista em finanças de food service." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI Gateway ${res.status}: ${txt}`);
    }
    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "Sem resposta.";
    return { content };
  });
