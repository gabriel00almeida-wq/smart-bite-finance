# Escopo desta rodada

Quatro mudanças concretas em cima do que já existe.

## 1. Histórico de lançamentos "clique para abrir" com detalhamento

Hoje o clique no card só troca o calendário. Vou transformar cada linha do histórico em um item expansível (`Accordion`) que mostra, por semana, todas as **entradas individuais** que geraram a DRE — no formato que você pediu:

```text
▸ 14 → 20 jul 2026     Receita R$ 45.000  Lucro R$ 3.200
    ─ Entradas registradas ───────────────
    R$    140,00   Hortifruti (CMV)                      13/07 21:04
    R$  1.600,00   Frete entregador                      14/07 09:12
    R$  5.000,00   Sem Limite (Fixo)                     14/07 09:12
    R$     79,00   Hortifruti (CMV)                      15/07 18:31
    R$  1.990,00   Sem Limite (Fixo)                     16/07 12:00
    ─────────────────────────────────────
    Total lançado ................ R$ 8.809,00
    [🗑 excluir semana]
```

Para isso preciso passar a registrar um **ledger** por semana: toda vez que o Cérebro aplicar um patch (ou você salvar via "Editar dados"), guardo cada campo mexido como uma linha (valor, rótulo, categoria, timestamp, origem: `chat` / `nota-fiscal` / `formulário`).

- Novo tipo `WeekEntry { id, at, source, label, categoria, valor }` dentro de `WeekData.ledger`.
- Cada `applyPatch` no `AiChatSheet` grava o texto original da sua mensagem + os campos alterados como entradas separadas do ledger da semana ativa.
- Migração leve em `loadWeek` (se não existir `ledger`, começa vazio — semanas antigas seguem funcionando, só sem detalhamento).
- Botão `🗑` em cada entrada para removê-la individualmente (recomputa os totais da semana).

## 2. Três CMVs: Contábil, Financeiro, Real

Reformulo `computeDre` e a linha "CMV" da DRE para exibir os três, com embalagens **sempre** dentro do CMV (por serem delivery):

- **CMV Contábil** = insumos + embalagens. É o custo puro da mercadoria vendida, sem influência de app/promo.
- **CMV Financeiro** = CMV contábil sobre a **receita líquida** (receita − taxas de apps − taxas de cartão − descontos − promoções). Mostra o "peso real" do CMV depois que o marketplace já tirou o pedaço dele.
- **CMV Real** = CMV Financeiro **abatendo o que ficou em estoque** (as sobras que você já lança no "Motor de Custos IA"). O estoque final vira crédito de mercadoria não consumida.

A tabela DRE ganha uma sub-seção "CMV" com três linhas + percentuais. O KPI "CMV Real" no topo passa a usar o CMV Real novo.

O cálculo de sobras deixa de ser apenas informativo — o botão "Calcular CMV com IA" passa a converter os kg de sobra em R$ (multiplicando pelo custo médio por kg de cada insumo, que a IA já lê nas notas) e alimentar o CMV Real.

## 3. Embalagem como insumo

Some `embalagens` dentro do CMV em todos os cálculos e remove a linha separada "Embalagens" dos custos variáveis — passa a aparecer como sub-linha do CMV Contábil. Nada muda no formulário de entrada, só no agrupamento visual e nos totais.

## 4. Nova aba "Custos Fixos Mensais" com rateio por dia

Novo item na sidebar → **Custos Fixos** (rota nova `/custos-fixos`). Tela contém:

- Formulário para cadastrar um custo fixo mensal (label, valor mensal, dia de vencimento opcional).
- Lista dos custos cadastrados com valor mensal e o **valor/dia** (mensal ÷ dias do mês corrente).
- Um resumo: "Total fixo mensal: R$ X · Custo por dia: R$ Y · Custo por semana (7 dias): R$ Z".
- Botão **"Aplicar rateio na semana atual"**: pega o valor/dia × número de dias do range do calendário e injeta no `fixos` da semana selecionada, substituindo o que estiver lá para não duplicar.

Persistência em `localStorage` sob a chave `dre-fixed-costs` (independente da semana).

## Detalhes técnicos

- `src/lib/dre-store.ts`: adicionar `ledger: WeekEntry[]` em `WeekData`, funções `addLedgerEntry`, `removeLedgerEntry`, refatorar `computeDre` para retornar `cmvContabil`, `cmvFinanceiro`, `cmvReal`, `receitaLiquida`, `estoqueValor`. Novo módulo pequeno `src/lib/fixed-costs-store.ts` para os fixos mensais.
- `src/components/AiChatSheet.tsx`: ao aplicar patch, iterar sobre os campos e chamar `addLedgerEntry` para cada um, marcando `source: "chat"` e guardando o `content` da mensagem original.
- `src/routes/index.tsx`: substituir a listagem plana do histórico por Accordion com detalhamento; renderizar as 3 linhas de CMV na DRE; ajustar o card KPI de CMV.
- `src/routes/custos-fixos.tsx`: nova rota.
- Sidebar ganha o item "Custos Fixos" com ícone `Wallet`.

Nada mexe em backend/IA — só front-end, store local e prompts (o system prompt do chat continua o mesmo; só passamos a **logar** o que ele aplicou).

Confirma que posso seguir? Se preferir dividir (ex.: fazer 1+3 agora, 2+4 depois), me diz.
