## Objetivo
Transformar o dashboard atual (hoje populado com dados fictícios) em uma ferramenta onde você preenche as entradas e custos da semana, o sistema calcula a DRE automaticamente e a IA gera os insights em cima dos SEUS números.

## O que muda na tela

### 1. Novo modo "Editar apuração"
- Botão **"Editar dados da semana"** no header, ao lado do seletor de semana.
- Abre um painel lateral (Sheet do shadcn) com formulário dividido em seções (Accordion):
  1. **Receitas por canal** — inputs de faturamento (R$) e nº de pedidos por canal: iFood, Rappi, 99Food, Próprio/WhatsApp, Salão.
  2. **Custos variáveis** — taxas de marketplace (%), taxas de pagamento (%), embalagens (R$), frete/entregador (R$).
  3. **CMV / Insumos** — reaproveita o Motor de Custos IA já existente (refrigerados + secos, sobras em kg) OU permite lançar CMV total manual.
  4. **Custos fixos** — aluguel, folha, pró-labore, energia, água, internet, softwares, contador, outros (linhas editáveis, com botão "adicionar linha").
  5. **Investimentos/Marketing** — ads iFood, ads Meta, influenciadores, outros.
- Botões **Salvar** e **Cancelar**. Ao salvar, todos os KPIs, gráficos, DRE e ticket médio recalculam com base no que você digitou.

### 2. Cálculos automáticos
- Receita bruta = soma das receitas por canal.
- Ticket médio = receita bruta / total de pedidos.
- Margem de contribuição = (receita − custos variáveis − CMV) / receita.
- Lucro líquido = receita − custos variáveis − CMV − fixos − investimentos.
- % por canal recalculado dinamicamente para o gráfico de pizza.

### 3. Persistência local
- Cada semana escolhida no calendário salva/carrega seus próprios dados em `localStorage` (chave por data de início da semana). Assim você pode voltar em semanas anteriores sem perder o preenchimento.
- Estado inicial: semana atual vazia (zeros) com dica "Clique em Editar dados para começar". Removo os números fictícios como padrão, mas deixo um botão **"Carregar exemplo"** para preencher rapidamente com dados de teste.

### 4. IA sobre dados reais
- O botão do cérebro continua igual, mas passa a enviar os dados que você preencheu (não mais o mock). Se a semana estiver vazia, ele avisa "Preencha a apuração antes de pedir análise".

## Detalhes técnicos
- Novo arquivo `src/lib/dre-store.ts`: tipos (`WeekData`, `Channel`, `FixedCost`, etc.), funções `loadWeek(weekKey)`, `saveWeek(weekKey, data)`, `computeDre(data)` (retorna os agregados usados hoje pelo dashboard).
- Novo componente `src/components/EditWeekSheet.tsx` com o formulário (Sheet + Accordion + Tabs + Inputs numéricos formatados em R$).
- `src/routes/index.tsx` deixa de ter constantes fictícias no topo; passa a ler `useState<WeekData>` sincronizado com localStorage por semana. Todos os cards, gráficos e a DRE consomem o resultado de `computeDre`.
- `analyzeDre` (server function) recebe o `dre` calculado a partir dos dados reais — assinatura atual já serve, só o payload muda.
- Sem backend/DB novo (é tudo local no navegador). Se quiser sincronizar entre dispositivos no futuro, aí ativamos Lovable Cloud.

## Fora de escopo
- Login/multiusuário, exportar PDF, comparativo semana vs. semana, integração real com iFood/Rappi. Posso adicionar depois se quiser.
