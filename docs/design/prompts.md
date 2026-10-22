# Prompts das imagens conceituais

Prompts usados para gerar as imagens de `conceitos/`. Use todos com o negative prompt do [README](README.md#negative-prompt).
Para uma tela nova, parta do bloco de estilo do README e troque só o conteúdo.

## Finanças (Visão geral) → `conceitos/financas.jpg`

```
High-fidelity UI mockup of a personal finance web dashboard, desktop 16:9 (1920x1080), dark mode, in a refined Apple "Liquid Glass" style (macOS Tahoe), following Apple Human Interface Guidelines. Premium, calm, minimal, content-first, 8pt grid, SF Pro typography, crisp and sharp, no device frame.

BACKGROUND AND PALETTE (strict): a deep, almost-black navy palette. Page background #0B0F17, main content area #0E131D, sidebar #090C12. The background is a smooth, very subtle vertical gradient between #0B0F17 and #101624 with an extremely faint fine grain texture. NO glowing orbs, NO light blobs, NO colorful bokeh, NO neon spots, no colored light behind the cards. Muted and elegant.

GLASS STYLE: cards, sidebar, top segmented control and buttons are dark smoked frosted glass panels: navy-tinted translucent fill (#131A26 to #161D2A at about 70-80% opacity) with background blur, a thin 1px light rim highlight (white at 10-14% opacity) brighter on the top edge and fading toward the bottom, a very subtle inner top sheen gradient, a soft deep shadow underneath, large concentric rounded corners (24px cards, 14px inner elements, capsule buttons). Glass must look sober and subtle, never shiny or colorful. The selected sidebar item and the selected tab are slightly lighter glass capsules (#1E2738).

ACCENT AND DATA COLORS: the main accent is blue #3B82F6 (links, selected states, highlighted bar, progress bars, the main donut segment). Secondary data colors are used sparingly and desaturated: green #34D399 for income, red #F87171 for expenses, plus #60A5FA, #818CF8, #A78BFA and #22D3EE for the other categories. Primary text #F1F5F9, secondary text #8B95A7. Thin outline SF Symbols style icons in #8B95A7, white when selected.

LAYOUT (all text in Brazilian Portuguese, currency R$):
- Left sidebar: logo "Zênite" with subtitle "Assistente Pessoal", menu with icons: Dashboard, Calendário, Finanças (selected), Tarefas, Senhas, Sugestões, Admin. Bottom: "Recolher", user avatar with name "Meu rei" and email, and "Sair".
- Top bar: glass month selector capsule "Outubro De 2026" with chevron buttons, a glass segmented control with tabs: Visão geral (selected), Transações, Contas, Cartões, Agendadas, Recorrentes. Far right: glass capsule button "Importar Extrato" with an upload icon.
- Row of 3 glass summary cards on the same dark navy glass (no colored card backgrounds): "Saldo do mês" with a blue sparkline, "Entradas" with a green sparkline, "Despesas" with a red sparkline and a small "-15%" badge. Only the sparkline and the value carry color.
- Glass card "Saídas por mês": rounded-top bars from Mai to Jan, the current month Out. in solid blue #3B82F6 with a soft subtle glow, the other bars in muted slate #2A3446, a thin dashed accumulated line, the value in R$ readable under each month.
- Glass card "Despesas por categoria": a donut chart, center text "TOTAL DO MÊS R$ 180,00", legend with a colored dot, category name, percentage and value in R$, plus a blue "Gerenciar" link.
- Glass card "Receitas e despesas": a smooth dual area chart, green income and red expenses with soft fading gradient fills, faint gridlines, months Jan to Dez.
- Glass card "Detalhamento de despesas": horizontal rounded progress bars per category (Moradia, Lazer, Transporte, Saúde, Assinaturas) on a #1E2738 track, value in R$ on the right.
- Right column: glass card "Contas" with total R$ 103,78 and the list: Bradesco, Inter, Mercado Pago, Renner, Santander, each with a round bank logo, "Conta bancária" and balance. Below, glass card "Cartões" with "Fatura do mês": Cartão Bradesco R$ 180,00 with a thin blue progress bar "22% do limite" and "R$ 6.500,00 disponível", Cartão Mercado Pago, Cartão Renner, Cartão Santander, each with a small card thumbnail.

Perfect alignment, consistent padding, sober and professional, ultra-detailed, sharp legible text, correct spelling, no watermark.
```

## Dashboard ("Seu Painel") → `conceitos/dashboard.jpg`

```
High-fidelity UI mockup of a personal assistant web app dashboard, desktop 16:9 (1920x1080), dark mode, refined Apple "Liquid Glass" style (macOS Tahoe), Apple Human Interface Guidelines, SF Pro typography (semibold white titles, regular gray labels), 8pt grid, crisp and sharp, no device frame.

STYLE: almost-black navy background with a very subtle vertical gradient #0B0F17 to #101624 and extremely faint grain; no glowing orbs, light blobs, bokeh or colored light. Cards are dark smoked frosted glass: navy fill #131A26 to #161D2A at about 75% opacity with blur, a 1px white rim highlight at 10-14% opacity brightest on the top edge and fading downward, a subtle inner top sheen, a soft deep shadow, 22px rounded corners, generous padding. Accent blue #3B82F6; green #34D399; red #F87171; amber #FBBF24; extra colors #818CF8, #A78BFA, #22D3EE. Primary text #F1F5F9, secondary text #8B95A7. Thin outline SF Symbols style icons.

SIDEBAR: solid darker #090C12, not floating, 1px hairline right border. Logo "Zênite" with a blue Z mark and the subtitle "Assistente Pessoal". Menu with outline icons: Dashboard (selected, soft lighter capsule #1E2738 with white text), Calendário, Finanças, Tarefas, Senhas, Sugestões, Admin. Bottom: "Recolher", a round avatar with the name "Meu rei" and an email, and "Sair".

CONTENT (text in Brazilian Portuguese):
- Header: small gray "Bom dia, Meu rei" and a large bold title "Seu Painel".
- Week strip glass card: 7 day columns DOM 18, SEG 19, TER 20, QUA 21, QUI 22 (today, a lighter glass tile with a glowing blue circle around 22), SEX 23, SÁB 24; small event dots under some days.
- 4 KPI glass cards, each neutral glass with a faint tinted glow in the top-left corner matching its color, a small icon, a big value and a gray label: "-R$ 180,00" in red with "Saldo do mês"; "0" in white with "Eventos hoje"; "4" in blue with "Tarefas pendentes"; "R$ 180,00" in amber with "Faturas abertas". Add a tiny sparkline to the money cards.
- Glass card "Próximos Eventos" with a blue "Ver todos →" link: a list with hairline separators, each row with a colored dot, a bold title and a gray clock icon with date and time: "Prova 3 - Patologia II" (26/10/2026 · 19:00, amber), "Cancelar Uber One" (29/10/2026 · 11:00, green), "Simulado ENADE" (04/11/2026 · 19:00, amber), "Prova 3 - Dietoterapia II" (05/11/2026 · 19:00, amber), "Emitir nota fiscal BF apoio" (06/11/2026 · 09:00, blue).
- Glass card "Finanças": a small donut or ring chart at the top with the center label "Saldo do mês -R$ 180,00" in red; below it "Receitas R$ 0,00" with a green trend-up icon and an empty progress track, "Despesas R$ 180,00" with a red trend-down icon and a full red progress bar; rounded bars on a #1E2738 track.
- Glass card "Tarefas de hoje": 3 compact rows with a round checkbox, a title and small colored tag pills.

Perfect alignment, sober and premium, sharp legible text, correct spelling, every amount formatted "R$ 0,00", no watermark.
```

## Calendário → `conceitos/calendario.jpg`

```
High-fidelity UI mockup of the calendar screen of a personal assistant web app, desktop 16:9 (1920x1080), dark mode, refined Apple "Liquid Glass" style (macOS Tahoe), Apple Human Interface Guidelines, SF Pro typography (semibold white titles, regular gray labels), 8pt grid, crisp and sharp, no device frame.

STYLE: almost-black navy background with a very subtle vertical gradient #0B0F17 to #101624 and extremely faint grain; no glowing orbs, light blobs, bokeh or colored light. Cards are dark smoked frosted glass: navy fill #131A26 to #161D2A at about 75% opacity with blur, a 1px white rim highlight at 10-14% opacity brightest on the top edge and fading downward, a subtle inner top sheen, a soft deep shadow, 22px rounded corners, generous padding. Accent blue #3B82F6; green #34D399; red #F87171; amber #FBBF24; purple #A78BFA; pink #F472B6; cyan #22D3EE. Primary text #F1F5F9, secondary text #8B95A7. Thin outline SF Symbols style icons.

SIDEBAR: solid darker #090C12, not floating, 1px hairline right border. Logo "Zênite" with a blue Z mark and the subtitle "Assistente Pessoal". Menu with outline icons: Dashboard, Calendário (selected, soft lighter capsule #1E2738 with white text), Finanças, Tarefas, Senhas, Sugestões, Admin. Bottom: "Recolher", a round avatar with the name "Meu rei" and an email, and "Sair".

CONTENT (text in Brazilian Portuguese):
- Header: small gray "2026" above a large bold title "Outubro", with two small glass circular chevron buttons beside it. On the right: a glass capsule showing a Google Calendar icon with a connected email and a small green dot, a glass outline capsule button "Importar do Google" with a cloud icon, and a solid blue capsule button "+ Novo Evento".
- A full-width glass search field with a magnifier icon and the placeholder "Pesquisar eventos...".
- Large glass card with the month grid: weekday headers DOM SEG TER QUA QUI SEX SÁB in small gray caps (weekend columns dimmer), 5 week rows with hairline grid lines, day numbers in the top-left of each cell (October 2026 starts on Thursday). Today, 22, has a glowing blue filled circle. Events appear as small rounded translucent pills tinted with the category color, a left color bar and white text: day 2 "10:00 Aniversário" (green) and "11:00 Emitir NFS-e" (blue) plus "+1"; day 4 "15:00 Terminar slides" (amber); day 6 "09:00 Emitir nota fiscal" (blue) and "19:00 Prova 2 - Farmaco" (amber); day 8 "19:00 Apresentação" (amber); day 10 "11:00 Barbeiro" (green); day 26 "19:00 Prova 3 - Patologia" (amber); day 29 "11:00 Cancelar Uber One" (green).
- Right glass card "Agenda do mês" with a calendar icon: filter chips with colored dots (Todas selected in blue, Trabalho, Pessoal, Saúde, Estudos, Finanças, Lazer), a hairline separator, then a grouped timeline: the date header "26/10/2026" with "Prova 3 - Patologia II · 19:00" (amber dot) and the date header "29/10/2026" with "Cancelar Uber One · 11:00" (green dot), connected by a thin vertical timeline line.
- Below the agenda, a small glass card "Hoje" with a mini summary: "Quinta, 22 de outubro" and "Nenhum evento hoje" with a soft calendar illustration icon.

Perfect alignment, sober and premium, sharp legible text, correct spelling, no watermark.
```

## Tarefas → `conceitos/tarefas.jpg`

```
High-fidelity UI mockup of the tasks screen of a personal assistant web app, desktop 16:9 (1920x1080), dark mode, refined Apple "Liquid Glass" style (macOS Tahoe), Apple Human Interface Guidelines, SF Pro typography (semibold white titles, regular gray labels), 8pt grid, crisp and sharp, no device frame.

STYLE: almost-black navy background with a very subtle vertical gradient #0B0F17 to #101624 and extremely faint grain; no glowing orbs, light blobs, bokeh or colored light. Cards are dark smoked frosted glass: navy fill #131A26 to #161D2A at about 75% opacity with blur, a 1px white rim highlight at 10-14% opacity brightest on the top edge and fading downward, a subtle inner top sheen, a soft deep shadow, 22px rounded corners, generous padding. Accent blue #3B82F6; green #34D399; red #F87171; amber #FBBF24; orange #FB923C; purple #A78BFA. Primary text #F1F5F9, secondary text #8B95A7. Thin outline SF Symbols style icons.

SIDEBAR: solid darker #090C12, not floating, 1px hairline right border. Logo "Zênite" with a blue Z mark and the subtitle "Assistente Pessoal". Menu with outline icons: Dashboard, Calendário, Finanças, Tarefas (selected, soft lighter capsule #1E2738 with white text), Senhas, Sugestões, Admin. Bottom: "Recolher", a round avatar with the name "Meu rei" and an email, and "Sair".

CONTENT (text in Brazilian Portuguese):
- Header: large bold title "Tarefas" with the gray subtitle "Organize o que precisa ser feito". On the right: a glass outline capsule button "Categorias" with a tag icon and a solid blue capsule button "+ Nova Tarefa".
- A row of 4 small glass stat cards: "4 Pendentes" (amber), "0 Em andamento" (blue), "0 Concluídas" (green), "1 Atrasada" (red), each with a tiny icon and a thin progress ring.
- A glass segmented control for status: Todas (4) selected as a lighter pill, Pendentes (4), Em andamento (0), Concluídas (0). Next to it, category filter chips with colored dots: Todas (selected, blue), Estudos (blue), Faculdade (orange), Filmes (green), Trabalho (red).
- A list of task rows, each its own glass card: a faint drag handle on the left, a round empty checkbox, a priority dot, a bold title, then small rounded pills below. Pencil and trash outline icons on the right, appearing subtle.
  1. "Fazer atividade de PGUAN II": pills "Pendente" (neutral glass), "Média" (amber text), "Faculdade" (orange tinted with a dot).
  2. "Pegar chuteira com Junior": pills "Pendente", "Média".
  3. "Verificar se minhas horas complementares foram validadas": pills "Pendente", "Média", "Faculdade", and a red calendar icon with "30/09/2026 · atrasada"; this card has a very subtle red rim on its left edge.
  4. "Filmes": a gray description line "O chamado da floresta, O pacto, Coração Selvagem, saga Transformers", pills "Pendente", "Baixa" (gray), "Filmes" (green tinted with a dot).
- Below the list, a dashed-outline glass row "+ Adicionar tarefa rápida" with a gray placeholder.

Perfect alignment, sober and premium, sharp legible text, correct spelling, no watermark.
```
