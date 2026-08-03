# Onda 18: redesign visual clean (sistema, shell e piloto em Finanças)

Data: 2026-08-03
Status: spec aprovado, aguardando plano de implementação

## 1. Objetivo

Trazer para o Zênite a linguagem visual moderna e clean de referência (base
monocromática, hierarquia por elevação, geometria muito arredondada, cor só como
sinal), usando a paleta que o projeto já tem. A Onda 1 entrega o sistema de
design, o shell e uma tela piloto. As demais telas herdam a pele nova e migram
em ondas seguintes.

Três decisões explicam o resto do documento:

1. **Base monocromática, cor só como sinal.** Todo o chrome vive na escala navy
   que o projeto já usa. Cor aparece onde carrega significado: ação primária,
   categoria, sinal do valor, alerta de estouro.
2. **Hierarquia por elevação, não por borda.** Um card se separa do fundo porque
   é mais claro, não porque tem contorno. Onde há linha, é hairline.
3. **Geometria consistente.** Controles em pill, cards arredondados, avatares
   circulares, barras full-round.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Escopo | Onda 1 = tokens + shell + biblioteca base + piloto em Finanças |
| Papel do azul | Shell neutro. Azul reservado a ação primária, anel de foco, link e série 1 dos gráficos. Item ativo e aba ativa passam a ser preenchimento cinza |
| Shell mobile | Adaptativo: app-frame só no desktop. Mobile mantém scroll de página e bottom nav |
| Efeitos | Removidos dentro do app, mantidos nas telas de auth |
| Tema claro | Mesma lógica de 3 superfícies, invertida |
| Escala de superfícies | Contraste alto |
| Tipografia | Duas famílias: Space Grotesk na marca e no título de página, Inter no resto (inclusive números). Plus Jakarta Sans sai |
| Densidade | Linha de 54px |
| Estratégia | Retokenizar por cima: mesmos nomes de token, valores novos, mais alguns tokens de superfície |
| Orçamento por categoria | Entra como feature, em fase isolada no fim da onda |

## 3. Sistema de design

### 3.1 Tokens de cor, tema escuro

```css
.dark {
  --background: #05070c;        /* moldura da janela e fundo de página */
  --sidebar: #05070c;           /* mesma cor da moldura: a nav some no fundo */
  --panel: #0b0f17;             /* NOVO: painel de conteúdo */
  --card: #111722;
  --popover: #141b27;
  --muted: #0f141d;             /* campos, trilho de barra, header de tabela */
  --secondary: #18202d;         /* hover de linha e card, botão secundário */
  --accent: #212a3a;            /* item ativo, aba ativa, chip de contexto */
  --accent-foreground: #e9edf5; /* era azul claro; agora neutro */
  --border: rgba(233, 237, 245, 0.07);
  --input: rgba(233, 237, 245, 0.10);
  --foreground: #e9edf5;
  --muted-foreground: #97a3b5;
  --subtle-foreground: #737f90; /* NOVO: legenda, contador, rótulo terciário */
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --ring: #3b82f6;
  --positive: #4ade80;
  --negative: #fb7185;
  --destructive: #ef4444;
  --sidebar-foreground: #e9edf5;
  --sidebar-accent: #212a3a;
  --sidebar-accent-foreground: #e9edf5;
  --sidebar-border: rgba(233, 237, 245, 0.07);
  --sidebar-ring: #3b82f6;
  /* chart-1..5 permanecem exatamente como estão */
}
```

### 3.2 Tokens de cor, tema claro

```css
:root {
  --background: #eef0f4;        /* moldura e sidebar, mais escuras que o painel */
  --sidebar: #eef0f4;
  --panel: #f7f8fa;
  --card: #ffffff;
  --popover: #ffffff;
  --muted: #eceff3;
  --secondary: #f2f4f7;
  --accent: #e7eaf0;
  --accent-foreground: #1c2430;
  --border: rgba(15, 23, 42, 0.08);
  --input: rgba(15, 23, 42, 0.14);
  --foreground: #1c2430;
  --muted-foreground: #4a5566;
  --subtle-foreground: #64707f;
  --primary: #2563eb;           /* era #3b82f6 */
  --primary-foreground: #ffffff;
  --ring: #2563eb;
  --positive: #16a34a;
  --negative: #e11d48;
}
```

O tema claro resolve um defeito atual: fundo e card eram os dois `#ffffff`, e a
separação vinha só da borda. Agora o card branco vive sobre painel off-white.

**Por que o azul muda no claro.** Branco sobre `#3b82f6` dá 3.1:1 e reprova em
AA para texto normal. Sobre `#2563eb` dá 4.6:1. No escuro o `#3b82f6` continua,
porque ali ele é usado sobre fundo escuro. `--chart-1` continua `#3b82f6` nos
dois temas, para não mexer na paleta categórica já validada.

**Contrastes verificados** (texto sobre a superfície onde ele de fato aparece):

| Par | Razão |
|---|---|
| `--muted-foreground` sobre `--panel`, escuro | 7.3:1 |
| `--subtle-foreground` sobre `--panel`, escuro | 4.8:1 |
| `--muted-foreground` sobre `--panel`, claro | 7.0:1 |
| `--subtle-foreground` sobre `--panel`, claro | 4.6:1 |
| `--primary-foreground` sobre `--primary`, claro | 4.6:1 |

### 3.3 Tipografia

Duas famílias. Sai `Plus_Jakarta_Sans` e o token `--font-num`: o Inter já tem
numerais tabulares bons, e o número passa a ter a mesma cor tipográfica da linha
em que vive.

- `--font-display` (Space Grotesk): marca na sidebar e título de página.
- `--font-sans` (Inter): todo o resto, incluindo dinheiro.

Escala, seis degraus, sem uppercase forçado e sem letter-spacing positivo:

| Uso | Tamanho / peso | Tracking |
|---|---|---|
| Título de página | 27 / 600 | -0.03em |
| Título de seção e de card | 19 / 600 | -0.02em |
| Nome de item, linha de tabela | 15 / 500 | 0 |
| Corpo | 13 / 400 | 0 |
| Header de tabela, metadado | 12 / 400 | 0 |
| Legenda, contador | 11 / 400 | 0 |

A utilitária `.num` perde a família própria e mantém só
`font-variant-numeric: tabular-nums` e `font-feature-settings: "tnum" 1`.
Dinheiro é sempre tabular e alinhado à direita.

### 3.4 Geometria e espaçamento

`--radius` passa de `0.625rem` para `0.75rem`, o que dá `lg` = 12px (card) e
`xl` ≈ 17px (painel) sem inventar valores fora da escala.

| Elemento | Raio |
|---|---|
| Painel | `xl` |
| Card, tabela, linha de tarefa | `lg` |
| Campo e chip retangular | `md` |
| Botão, aba, chip de contexto, busca, barra de progresso | pill |
| Avatar | círculo |

Espaçamento em grade de 4px: margem da moldura 12px, padding do painel 16px, gap
entre cards 12px, padding de card 16px, gap interno 8px e 12px.

Densidade: linha de tabela 54px, header de tabela 36px, avatar de marca 28px,
altura de controle no header 36px. Os 54px já entregam alvo de toque adequado no
mobile, o que evita manter uma segunda densidade só para lá.

### 3.5 Movimento e efeitos

Dentro do grupo `(app)`:

- Transições de 150ms, só em `background-color` e `color`. Sai o `translateY` e o
  halo azul do `.card-glow`, que passa a ser apenas clareamento de fundo.
- Sai o `.grain-overlay`.
- Saem `.text-gradient` e `.text-gradient-animated`.
- `.glass` fica restrito a popovers e sheets.
- Scrollbar passa a 6px, thumb `rgba(233,237,245,.14)` e `.22` no hover, sem azul.
- Ficam: `.bar-grow` nas barras e o crossfade de rota de 0.3s.
- Foco: anel de 2px em `--ring` com offset de 2px, nunca o outline padrão.

Nas rotas `(auth)` os efeitos atuais permanecem como estão.

A rede de segurança de `prefers-reduced-motion` que já existe em `globals.css`
continua valendo sem alteração.

## 4. Shell

### 4.1 Desktop

```
┌───────────────────────────────────────────────┐
│ SIDEBAR   │  ╭──────── PAINEL ────────────╮   │
│ #05070c   │  │ header fixo                │   │
│ sem borda │  │ ─────────────────────────  │   │
│           │  │ conteúdo, scroll interno   │   │
│           │  ╰────────────────────────────╯   │
└───────────────────────────────────────────────┘
```

- A página não rola. Quem rola é o painel, o que mantém header e abas sempre
  visíveis.
- A sidebar perde a `border-r` e o `backdrop-blur`: ela tem a mesma cor da
  moldura e se separa do painel pelo vão, não por linha.
- Item ativo: preenchimento `--accent`, texto `--foreground`. Inativo:
  `--muted-foreground`. Hover: `--secondary`.
- Recolher, tema e perfil continuam no rodapé da sidebar, separados por hairline.
  A preferência de recolhido em `localStorage` é mantida.
- O título da página sai do corpo no desktop: sidebar e abas já dizem onde
  você está.

### 4.2 Mobile

Estrutura inalterada: scroll de página, título no topo, bottom nav com
safe-area. Só a pele muda (tokens e componentes novos). Nada de header fixo ou
scroll interno, para não regredir teclado do iOS, overscroll e safe-area, que já
estão resolvidos.

## 5. Biblioteca de componentes

Novos, em `src/components/ui/`:

| Componente | O que faz | Depende de |
|---|---|---|
| `app-frame.tsx` | Moldura e painel com scroll interno no desktop; repassa direto no mobile | tokens |
| `panel-header.tsx` | Linha de topo: contexto, abas, ações. Slots `context`, `tabs`, `actions` | `segmented`, `button` |
| `segmented.tsx` | Abas em pill. Aceita modo controlado ou navegação por URL (as abas de Finanças são URL-driven) | tokens |
| `meter.tsx` | Barra de 4px full-round com linha de rótulos acima. Props: `value`, `max`, `leftLabel`, `rightLabel`. Trava a barra em 100% e vira `--negative` no estouro, mantendo o número real no texto | tokens |
| `brand-avatar.tsx` | Círculo com logo da marca; fallback de inicial | `lib/finance/brands.ts` |
| `money.tsx` | Valor tabular com sinal e cor semântica | `lib/money.ts` |
| `category-chip.tsx` | Marcador de cor e nome, sem fundo | `entity-icon` |
| `search-input.tsx` | Campo pill | `input` |
| `data-table.tsx` | Casca da tabela: header sticky, linha de 54px, hairlines, hover, slot de ações | tokens |

O `meter.tsx` serve três casos com um componente só: orçamento por categoria,
limite de cartão e qualquer progresso futuro. É a peça central da onda.

Alterados: `globals.css`, `app/layout.tsx` (fontes), `app/(app)/layout.tsx`,
`layout/sidebar.tsx`, `layout/bottom-nav.tsx`, `ui/button.tsx` (variantes pill),
`ui/input.tsx`, `finance/category-donut-chart.tsx`,
`finance/accounts-summary.tsx`, `finance/card-manager.tsx`.

### 5.1 Avatar de marca

Sem chamada externa: o app roda em Capacitor e uma dependência de rede para
logo significa CSP, latência e vazamento do que a pessoa consome para um
terceiro.

- Assets locais em `public/brands/*.svg`, começando por cerca de 25 marcas
  comuns no Brasil.
- Mapa de palavra-chave para slug em `src/lib/finance/brands.ts`, casando contra
  a descrição normalizada (sem acento, minúscula).
- Sem correspondência: inicial sobre cor derivada de hash do nome, tirada de uma
  paleta **neutra dessaturada**, nunca da paleta categórica, para a cor do avatar
  não competir com o significado da cor de categoria.

## 6. Tela piloto: Finanças

### 6.1 Header do painel

Uma linha, controles de 36px: chip de período, abas segmentadas (Visão geral,
Transações, Categorias, Contas), busca, Filtros, e um único botão primário
`+ Transação`. O azul aparece uma vez só na tela.

### 6.2 Visão geral

Grid de duas colunas, `1.55fr / 1fr`, gap 12px.

**Coluna principal**

- *Saídas por mês*: barras cinzas de topo arredondado, sem eixos e sem grid.
  Rótulo e valor impressos abaixo de cada barra. O mês corrente não muda de cor:
  ganha um bloco de fundo mais claro atrás da coluna inteira e o rótulo em
  `--foreground`. Rola horizontalmente.
- *Transações recentes*: `data-table` com avatar de marca, `category-chip`, data
  e `money`.

**Rail direito**

- *Contas*: bancos e carteira, com avatar, nome, tipo em linha secundária e saldo
  à direita. Total no cabeçalho do card.
- *Cartões*: card separado dos bancos, porque no modelo do projeto `CreditCard`
  já é entidade distinta de `Bank`. Fatura do mês como valor principal, linha de
  fecha/vence, e um `meter` com limite consumido e disponível.
- *Despesas por categoria*: o donut atual (recharts, lazy-loaded, total no
  miolo), com a legenda enriquecida: cada linha traz marcador, nome, valor e,
  logo abaixo, um `meter` com percentual do limite e quanto resta. Categoria sem
  limite mostra "Sem limite definido".

A legenda enriquecida evita o problema de dois percentuais concorrentes: a fatia
diz participação no gasto, a barra diz consumo do limite, cada uma no seu
contexto, e a categoria aparece uma vez só.

### 6.3 Transações e Categorias

Ambas passam a usar `data-table` com a densidade de 54px, coluna de tipo com
seta diagonal colorida, avatar de marca, `category-chip` e `money`.

## 7. Orçamento por categoria (fase isolada, no fim da onda)

O tipo `Category` em `src/types/finance.ts` tem só `id`, `name`, `icon`, `kind`:
**não existe limite mensal por categoria no app hoje**. O gasto do mês por
categoria já existe, porque é o que alimenta o donut (`CategorySlice.total`).
Falta só o limite.

Esta fase entra por último, depois do visual estar de pé e validado. Se for
abortada, o redesign continua íntegro e a legenda apenas não mostra `meter`.

- **Migração**: coluna `monthly_limit` em `categories`, nula por padrão, com o
  mesmo tipo e escala de `credit_cards.credit_limit`, para consistência de
  dinheiro no schema. A tabela já tem RLS `own_rows`, e a coluna herda.
  Rodada à mão no SQL Editor do Supabase, já que a CLI está bloqueada nesta
  máquina.
- **UI**: campo "Limite mensal" em `finance/category-manager.tsx`, opcional.
  Vazio significa sem limite.
- **Server Action**: a action de salvar categoria passa a aceitar o limite.
- **Leitura**: `CategorySlice` ganha `limit: number | null`, e a legenda do donut
  renderiza `meter` quando houver limite.

## 8. Fora de escopo desta onda

- Barra de comando flutuante com entrada em linguagem natural. É a assinatura
  mais forte da referência, mas é funcionalidade, não estilo, e merece onda
  própria.
- Migração visual de Dashboard, Calendário, Tarefas, Senhas, Sugestões, Perfil e
  Admin. Elas herdam os tokens, mas não ganham os componentes novos agora.
- App-frame no mobile.
- Logo de marca vindo do payload da Pluggy. Vale verificar em onda futura se o
  merchant traz logo utilizável, o que reduziria o mapa local.

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Telas não migradas herdam tokens novos e podem ficar estranhas | Varredura visual de cada rota logo após a fase de tokens, em dark e light, corrigindo só o que ficar ilegível |
| `--accent` deixa de ser azul e vira cinza | Procurar usos de `bg-accent` e `text-accent-foreground` que dependiam do azul e decidir caso a caso |
| `.card-glow` e `.glass` são utilitárias globais | A mudança afeta todas as telas de uma vez, que é o efeito desejado, mas exige a mesma varredura |
| `--primary` muda no tema claro | Procurar dependência do hex literal `#3b82f6` fora dos tokens |
| Remoção de `--font-num` | Procurar usos de `.num` e da variável antes de remover a fonte do `app/layout.tsx` |
| Migração de banco no fim da onda | Fase isolada e reversível: sem ela, a legenda simplesmente não mostra barra |

## 10. Validação

- `npm run build` a cada fase.
- Varredura de travessão: `rg "—|–" src`, sem ocorrência em string de UI.
- Conferência manual de todas as rotas nos dois temas, em desktop e mobile.
- Conferência específica do app instalado (Capacitor) para safe-area, teclado e
  overscroll, já que o shell do mobile não deve mudar.
- Registro da onda no `HANDOFF.md` antes de encerrar.
