# Delivery CFO

Crie um Web App de DRE (Demonstração do Resultado do Exercício) e Gestão Financeira focado em Delivery de Restaurante. O aplicativo deve ser construído usando React, Tailwind CSS, shadcn/ui, Lucide Icons e Recharts para os gráficos. 

O estilo visual deve ser "SaaS Financeiro Moderno", com um layout limpo, fundo em tons de cinza super claro (bg-slate-50) e cards brancos com sombras suaves. A interface deve ser responsiva.

**ESTRUTURA GERAL DO LAYOUT:**

1. **Sidebar (Menu Lateral):** Fixo na esquerda, fundo escuro (bg-slate-900), com logo no topo e os itens de navegação com ícones do Lucide: Dashboard, DRE Completa, Motor de Custos (IA), e Integrações.

2. **Header (Barra Superior):** Fundo branco, com um "Seletor de Mês/Ano" (ex: Julho 2026), um botão outline de "Exportar Relatório" e o avatar do usuário.

3. **Área Principal (Main Content):** Onde as telas renderizam. Preencha com os dados fictícios abaixo para a tela inicial (Dashboard).

**TELA INICIAL (DASHBOARD) - O QUE DEVE CONTER:**

**Seção 1: KPIs (4 Cards lado a lado no topo):**

- Card 1: "Margem de Contribuição", Valor: "18.5%", Badges: Seta pra cima verde, texto "+2% vs último mês".

- Card 2: "CMV Real", Valor: "31.2%", Badges: Seta pra baixo verde (indicando que o custo caiu).

- Card 3: "Lucro Líquido", Valor: "R$ 12.450,00".

- Card 4: "Ticket Médio", Valor: "R$ 95,50".

**Seção 2: Gráficos (Lado a lado):**

- Esquerda (Crescimento 2/3 do espaço): Um Gráfico de Barras (Bar Chart do Recharts) mostrando a "Receita vs Custos" dos últimos 6 meses.

- Direita (1/3 do espaço): Um Gráfico de Rosca (Donut Chart) mostrando as "Vendas por Canal": iFood (45%), 99Food (25%), Anotai (30%). Use cores distintas (Vermelho pro iFood, Amarelo pro 99Food, Verde pro Anotai).

**TELA DE DRE (Simule abaixo do Dashboard ou como um componente expansível):**

- Crie uma Tabela ou Lista usando o componente `Accordion` do shadcn/ui.

- O usuário deve conseguir clicar na linha principal para expandir e ver os detalhes.

- Linha 1 (Expandida): "Receita Bruta Total" -> Sub-linhas: iFood, 99Food, Anotai.

- Linha 2 (Expandida): "Custos Variáveis" -> Sub-linhas: CMV (Insumos), Embalagens, Taxas iFood, Taxas 99Food, Taxas Cartão Anotai.

- Linha 3: "Margem de Contribuição".

- Linha 4: "Custos Fixos".

- Linha 5 (Destaque): "Lucro Líquido".

**TELA DO "MOTOR DE CUSTOS IA" (Crie um Card grande simulando essa área):**

- Divida esse card em duas colunas (Split screen).

- Coluna da Esquerda ("Entrada de Notas"): Uma área de Drag & Drop pontilhada escrito "Arraste as fotos das notas fiscais ou clique para fazer upload". Abaixo, uma pequena lista de "Últimas notas lidas pela IA" com ícone de check verde.

- Coluna da Direita ("Apuração de Sobras"): Um formulário simulando abas (Tabs do shadcn/ui) com "Refrigerados" e "Secos". Dentro, uma lista rápida de insumos (Ex: Salmão, Arroz, Cream Cheese) com um input de número na frente para o usuário digitar a sobra em KG. Um botão grande azul no fim: "Calcular CMV com IA".

Por favor, gere todo o código em um único arquivo ou estrutura navegável, garantindo que a interface fique lindíssima, funcional (com os accordions e tabs funcionando) e preenchida com esses dados fictícios realistas.

```eof

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/207e4b48-3304-4854-b03f-8fa7cb3eaf76).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
