# Direção de design — Modernização visual e interatividade (Onda 13)

> Extraída das 4 imagens de inspiração enviadas pelo dono em 2026-07-27, reconciliada com os
> tokens e o design system atuais do Zênite. As imagens são referência de LINGUAGEM, não de
> pixel. Fases de implementação no prompt original (Fases 0 a 4).

## 1. O que as imagens dizem

- **Img 1 (wallet dark):** preto profundo + cards cinza-escuro elevados, raio grande (~20-24px),
  números brancos em peso alto, cor vibrante SÓ nos dados (arco segmentado multicolor), pills,
  tab bar inferior. Profundidade por elevação sutil, não por glow.
- **Img 2 (lavanda + holográfico):** cards escuros flutuando sobre fundo claro, cartão com
  gradiente aurora/iridescente, tabs em pill branco, barras com um lilás de destaque, números
  grandes em peso leve. Contraste "objeto escuro sobre palco claro".
- **Imgs 3 e 4 (app Pierre, norte real do dono):** dark imersivo, saudação grande e pessoal
  ("Boa tarde, Pedro"), acento neon lime, negativo em coral/rosa e positivo em verde vivo,
  bento grid 2 colunas, listas com ícone circular + badge do banco + valor colorido à direita,
  barra de categorias segmentada multicolor, dock inferior em pill flutuante, chip de destaque
  ("Pierre Pro") em pill de acento.

**Síntese:** fintech dark premium, calmo e pessoal. Cor de marca contida; a cor "explode" apenas
onde há dado (dinheiro, categorias, progresso). Números são os protagonistas. Formas grandes e
arredondadas, profundidade por camadas (fundo -> card -> pill), movimento discreto e físico.

## 2. Direção mapeada aos tokens do Zênite

### Paleta
- **Manter a base atual:** `--background #080b12`, `--card #0e131d`, `--border #1c2536` já são
  exatamente a lógica das referências (preto azulado + card 1 passo acima). Nada muda.
- **Primária:** manter `--primary #3b82f6` (azul) como cor de marca e ação. A migração para
  lime neon estilo Pierre é um rebrand: DECISÃO DO DONO (pergunta aberta no checkpoint da
  Fase 0). Se aprovada, é troca de token global (`--primary`, `--ring`, `--sidebar-primary`)
  em uma fase própria, não espalhada pelas fases 1-4.
- **Semântica de dinheiro (novidade, vem das 3 referências):** hoje o app usa `green-600/400`
  e `red-600/400` ad hoc. Adotar par mais "fintech": positivo verde vivo (`#4ade80` no dark,
  `#16a34a` no light) e negativo coral/rosa (`#fb7185` no dark, `#e11d48` no light), expostos
  como tokens `--positive` / `--negative` no globals.css para uso consistente (valores, setas,
  barras). Aplicação gradual nas fases 3-4, sem quebrar telas.
- **Cor categórica:** usar `--chart-1..5` existentes nas barras segmentadas de categoria
  (estilo Pierre/img 1); nunca cor nova solta em componente.

### Tipografia
- Manter o trio: **Inter** (corpo), **Space Grotesk** (títulos), **Plus Jakarta Sans** (`.num`,
  números com tabular-nums). É o mesmo vocabulário das referências.
- Hierarquia de número sobe um degrau nos heróis (saldo/gasto do mês): `text-3xl/4xl`
  extrabold `.num`, rótulo pequeno em `muted-foreground` acima (padrão Pierre). Valores em
  listas: `text-sm/base` semibold colorido pela semântica de dinheiro.

### Forma e profundidade
- **Raio:** subir o token `--radius` de `0.5rem` para `0.625rem` (2xl passa de ~14px para 18px,
  3xl ~22px), aproximando das referências sem tocar componente por componente (é 1 linha).
- **Elevação:** `.glass` mantém. `.card-glow` fica mais contido (lift -2px, glow mais neutro,
  menos azul difuso): profundidade por camada e borda, como nas imagens, não por neon.
- **Pills:** chips/tabs/dock usam `rounded-full`; já é o padrão do bottom-nav atual.

### Movimento (tom: "calmo, físico e discreto")
- Micro (hover/tap): 150-200ms; tap com scale 0.97 (spring suave, sem bounce).
- Entradas: 250-350ms ease-out; saídas ~65% da entrada; stagger 30-60ms por item.
- Números contam (CountUp/NumberFlow); barras crescem; rotas com crossfade/slide curto.
- Fonte única de tokens: `src/lib/motion.ts` (DUR/EASE/SPRING/variantes) para GSAP e motion.
- **prefers-reduced-motion em tudo:** CSS global (globals.css) + `src/hooks/use-reduced-motion.ts`
  (hook reativo + helper imperativo) no lado JS.

### Divisão de runtimes (decisão de lib)
- **GSAP (existente):** timelines, ScrollTrigger, hero, contagem (Reveal/CountUp seguem).
- **motion (Fase 1):** AnimatePresence (modal/folhas/entra-sai), animação de layout,
  microgestos whileHover/whileTap. Import por componente (tree-shake); nada de motion em
  Server Components, só wrappers "use client" pequenos.

## 3. Anti-padrões (o que NÃO fazer)
- Não copiar o lime do Pierre sem decisão do dono; não introduzir 2ª cor de marca por conta.
- Não animar width/height/top/left (só transform/opacity); nada acima de ~400ms.
- Não colocar AutoAnimate em listas @dnd-kit (brigam pelos transforms).
- Não usar travessão em texto visível (regra do projeto).
- Não transformar Server Components em client para animar: wrapper client pequeno por cima.
