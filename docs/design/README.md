# Direção visual do Zênite: "Smoked Navy Glass"

> Estilo de design aprovado pelo dono em 22/10/2026 para as **próximas modificações visuais** do site.
> As imagens em `conceitos/` são mockups gerados por IA (não são o site atual). Servem de alvo visual.
> Implementar este estilo continua passando pelo fluxo do `CLAUDE.md` (brainstorming, spec, plano, visualização).

## Imagens conceituais

| Tela | Arquivo |
|---|---|
| Dashboard ("Seu Painel") | [conceitos/dashboard.jpg](conceitos/dashboard.jpg) |
| Calendário | [conceitos/calendario.jpg](conceitos/calendario.jpg) |
| Finanças (Visão geral) | [conceitos/financas.jpg](conceitos/financas.jpg) |
| Tarefas | [conceitos/tarefas.jpg](conceitos/tarefas.jpg) |

O que **não** copiar das imagens (erros do gerador): legenda do donut de Finanças mostrando códigos de cor
(`#A78BFA`) no lugar de valores, meses escritos errado ("Goit", "Oot"), link "Gerenciar" duplicado, pills
de "Tarefas de hoje" no Dashboard mostrando hex. Os valores numéricos das imagens são ilustrativos.

## Princípios

- Base: Apple Human Interface Guidelines, linguagem "Liquid Glass" (macOS Tahoe), mas **sóbria**.
- Fundo escuro azul-marinho, sem efeitos chamativos. **Proibido**: bolas de luz, blobs, bokeh, neon,
  fundo roxo ou gradiente vibrante. O dono rejeitou explicitamente essas variações.
- O vidro aparece pela borda de luz fina e pela leve diferença de tom entre card e fundo, não por cores
  brilhando atrás.
- A cor fica nos dados (valores, gráficos, pontos de categoria), não no fundo dos cards.

## Tokens

### Superfícies

| Token | Valor | Uso |
|---|---|---|
| `bg-page` | `#0B0F17` → `#101624` | Fundo da página, gradiente vertical sutil + grão bem leve |
| `bg-sidebar` | `#090C12` | Sidebar sólida, não flutua, borda direita hairline |
| `glass-card` | `#131A26` a `#161D2A`, ~75% opacidade + blur | Cards |
| `glass-selected` | `#1E2738` | Item ativo da sidebar, aba ativa, trilho de barras de progresso |
| `rim` | branco 10% a 14% | Borda de 1px, mais forte no topo, some para baixo |
| `separator` | branco ~8% | Linhas entre itens de lista |

### Texto e cores

| Token | Valor | Uso |
|---|---|---|
| `text-primary` | `#F1F5F9` | Títulos, valores |
| `text-secondary` | `#8B95A7` | Labels, subtítulos, ícones inativos |
| `accent` | `#3B82F6` | Links, seleção, botão primário, barra do mês atual, "hoje" |
| `positive` | `#34D399` | Entradas, receitas, concluído |
| `negative` | `#F87171` | Despesas, atrasado, saldo negativo |
| `warning` | `#FBBF24` | Faturas abertas, pendentes, prioridade média |
| `orange` | `#FB923C` | Categoria Faculdade |
| Extras de dados | `#60A5FA` `#818CF8` `#A78BFA` `#22D3EE` `#F472B6` | Categorias, donut |

### Forma e espaço

- Grid de 8pt. Tipografia SF Pro (no web: stack do sistema). Títulos semibold brancos, labels regular cinza.
- Raios concêntricos: cards ~22px, elementos internos 12px a 14px, botões e chips em cápsula.
- Sombra profunda e suave embaixo dos cards. Sheen interno discreto no topo.
- Ícones de contorno fino, estilo SF Symbols (no projeto: lucide).

## Componentes

- **Sidebar**: logo "Zênite" (Z azul) + "Assistente Pessoal"; itens com ícone de contorno; ativo em cápsula
  `glass-selected` com texto branco; rodapé com Recolher, avatar e Sair.
- **Topo de página**: título grande em negrito com subtítulo cinza (Tarefas, Seu Painel) ou ano pequeno +
  mês grande com setas em círculos de vidro (Calendário). Ações à direita: botão secundário em cápsula de
  vidro com contorno, botão primário em cápsula azul sólida.
- **Controle segmentado / abas**: cápsula de vidro com divisórias hairline; aba ativa em pílula mais clara.
- **Cards de KPI**: vidro neutro com brilho tingido só no canto superior esquerdo, na cor da métrica. O valor
  e o sparkline levam a cor. Badge pequeno tingido para variação (%).
- **Gráficos**:
  - Barras com topo arredondado em cinza-ardósia `#3A4558`; o item atual em azul com brilho suave; linha
    tracejada de acumulado.
  - Donut em família azul/índigo/roxo/ciano com total no centro; legenda = ponto + nome + % + valor.
  - Áreas sobrepostas (verde receitas, vermelho despesas) com preenchimento translúcido que esmaece e grade fraca.
  - Barras de progresso horizontais arredondadas, uma cor por categoria, trilho `glass-selected`.
- **Listas**: logo redondo colorido (bancos), nome + subtítulo cinza, valor alinhado à direita, separador hairline.
- **Calendário**: grade com linhas hairline, fim de semana mais apagado, "hoje" com círculo azul brilhante,
  eventos como pílulas translúcidas tingidas com barra de cor à esquerda. Agenda lateral em linha do tempo.
- **Tarefas**: cada tarefa é um card de vidro (alça de arrastar, checkbox redondo, ponto de prioridade, título,
  pills de status/prioridade/categoria, lápis e lixeira discretos). Tarefa atrasada ganha borda vermelha sutil
  à esquerda. Linha tracejada "+ Adicionar tarefa rápida" no fim da lista.

## Notas para implementar (web)

- Vidro em CSS: `background: rgb(19 26 38 / 0.75); backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgb(255 255 255 / 0.08); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), 0 20px 40px rgb(0 0 0 / 0.45);`
- Sempre ter fallback sólido (`@supports not (backdrop-filter: blur(1px))` → `#141B28` opaco).
- Contraste mínimo WCAG AA no texto sobre o vidro. Respeitar `prefers-reduced-motion`.
- Os tokens devem entrar em `src/app/globals.css`, convivendo com os atuais, e o tema claro precisa de
  versão própria (estas imagens só cobrem o escuro).

## Como gerar novas imagens conceituais

Prompts em inglês (geradores respondem melhor), texto da interface em português, dinheiro em `R$ 0,00`.
Monte assim: **bloco de estilo** + **bloco de sidebar** + **conteúdo da tela** + **regras de precisão**,
e use sempre o **negative prompt**. Os prompts completos usados estão em [prompts.md](prompts.md).

### Bloco de estilo (copiar igual)

```
High-fidelity UI mockup of <SCREEN> of a personal assistant web app, desktop 16:9 (1920x1080), dark mode, refined Apple "Liquid Glass" style (macOS Tahoe), Apple Human Interface Guidelines, SF Pro typography (semibold white titles, regular gray labels), 8pt grid, crisp and sharp, no device frame.

STYLE: almost-black navy background with a very subtle vertical gradient #0B0F17 to #101624 and extremely faint grain; no glowing orbs, light blobs, bokeh or colored light. Cards are dark smoked frosted glass: navy fill #131A26 to #161D2A at about 75% opacity with blur, a 1px white rim highlight at 10-14% opacity brightest on the top edge and fading downward, a subtle inner top sheen, a soft deep shadow, 22px rounded corners, generous padding. Accent blue #3B82F6; green #34D399; red #F87171; amber #FBBF24; extra colors #818CF8, #A78BFA, #22D3EE. Primary text #F1F5F9, secondary text #8B95A7. Thin outline SF Symbols style icons.

SIDEBAR: solid darker #090C12, not floating, 1px hairline right border. Logo "Zênite" with a blue Z mark and the subtitle "Assistente Pessoal". Menu with outline icons: Dashboard, Calendário, Finanças, Tarefas, Senhas, Sugestões, Admin (<SELECTED> selected, soft lighter capsule #1E2738 with white text). Bottom: "Recolher", a round avatar with the name "Meu rei" and an email, and "Sair".
```

### Regras de precisão (acrescentar no fim)

```
Legends show category name + percentage + R$ value, never color hex codes. Month abbreviations exactly: Jan Fev Mar Abr Mai Jun Jul Ago Set Out Nov Dez. Every amount formatted "R$ 0,00". No duplicated links. Perfect alignment, sober and premium, sharp legible text, correct spelling, no watermark.
```

### Negative prompt

```
glowing orbs, light blobs, bokeh, colored light spots, neon glow, purple background, vibrant gradient background, colorful card backgrounds, shiny reflective glass, rainbow refraction, low contrast text, unreadable numbers, hex color codes as text, misspelled words, distorted letters, cluttered layout, device frame, watermark
```
