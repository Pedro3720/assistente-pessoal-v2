# Onda 1 das Sugestões — Marca (Zênite + logo) e Fonte dos números

**Data:** 2026-07-07
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase / TS strict)
**Status:** Aprovado — pronto para o plano de implementação

> Primeira onda da implementação das sugestões dos usuários (aba de Sugestões). Cobre as sugestões
> **#9 + #15** (renomear para "Zênite Assistente Pessoal" + logo), **#3** (fonte dos números) e fecha a
> **#13** (pergunta já respondida). Segue os padrões do projeto (camada visual, TS strict, sem `any`).

## 1. Objetivo
- **#9 + #15:** trocar o nome do app para **"Zênite Assistente Pessoal"** e colocar a **logo** enviada pelo
  usuário (emblema branco sobre fundo preto) na sidebar, no login e na aba do navegador.
- **#3:** trocar a fonte dos números (valores/datas) de **JetBrains Mono** para **IBM Plex Mono** (mono mais
  suave), mantendo o alinhamento tabular.
- **#13:** marcar a sugestão como **"feito"** (é uma pergunta já respondida: as sugestões ficam na tabela
  `suggestions` + bucket `suggestions` no Supabase).

## 2. Fora de escopo (YAGNI)
- Redesign visual além de nome/logo/fonte. As demais sugestões são de ondas seguintes.
- Criar variações de logo (só a processada + o favicon).

## 3. Logo — processamento
A origem é um JPG 1024×1024, emblema **branco/prata sobre fundo preto puro**, sem transparência. URL pública:
`https://qlqewlrzjlbwrybwrimt.supabase.co/storage/v1/object/public/suggestions/99c9c485-e0a5-4bc4-906d-4d00ad447b03/1783427682586.jpg`

Gerar dois assets com um script **Node + `sharp`** (já instalado):
- `public/logo.png` — **fundo transparente**: usar a **luminância como canal alfa** (preto→transparente,
  branco→opaco), RGB forçado para branco. Preserva as linhas finas com bordas suaves.
- `src/app/icon.png` — **favicon**: o emblema num **ladrilho escuro** (ex.: 64×64, fundo `#080b12`
  arredondado), para ler bem na aba do navegador (onde um emblema branco puro sumiria). Next.js usa
  `app/icon.png` automaticamente como favicon.

Uso da logo na UI: `next/image` (ou `<img>`), com classe Tailwind `invert dark:invert-0` — no tema **claro**
o emblema branco é invertido para escuro (visível), no **escuro** fica branco. (O host do Supabase já está
liberado em `next.config.ts`, mas os assets são locais em `public/`, então nem precisa.)

## 4. Onde aplicar (nome + logo)
- **`src/app/layout.tsx`**: `metadata.title` → `"Zênite Assistente Pessoal"`. Trocar a fonte dos números
  (seção 5). O favicon é automático via `src/app/icon.png`.
- **`src/components/layout/sidebar.tsx`** (bloco "Brand", ~linha 68-76): substituir o `<span>Assistente</span>`
  por logo (`public/logo.png`, ~28-32px, `invert dark:invert-0`) + texto **"Zênite"** com subtítulo pequeno
  "Assistente Pessoal". Manter o `<ThemeToggle />` ao lado.
- **`src/app/(auth)/login/page.tsx`** (~linha 21-27): acima/junto do `<h1>`, colocar a logo (maior, ~48-56px)
  e o título **"Zênite Assistente Pessoal"** (mantendo o `text-gradient`/`var(--font-display)`).

## 5. Fonte dos números (#3)
- **`src/app/layout.tsx`**: trocar o import `JetBrains_Mono` por `IBM_Plex_Mono` de `next/font/google`,
  configurando `variable: "--font-mono"` (mesma variável). IBM Plex Mono precisa de `weight` explícito
  (ex.: `["400","500","600"]`). Remover o uso do `jetbrainsMono` e usar o novo na `<body className=...>`.
- Nada muda em `globals.css`: a classe `.num` já usa `var(--font-mono)` + `tabular-nums`, então **todos** os
  valores/datas trocam de fonte de uma vez.

## 6. Fechar a #13
- Atualizar `suggestions.status = 'feito'` para o id 13 (via chave de serviço no servidor, fora do build —
  passo operacional; não é código de produto). Alternativa: o usuário marca pelo painel Admin. O plano
  registra isso como passo final, não como task de código.

## 7. Verificação
- `npm run build` sem erro (fontes, imports, metadata).
- Visual (rodar o app): sidebar mostra a logo + "Zênite"; login mostra logo + "Zênite Assistente Pessoal";
  aba do navegador com o novo título e favicon; os números aparecem em IBM Plex Mono; logo visível nos temas
  claro e escuro.

## 8. Ordem sugerida
1. Gerar `public/logo.png` + `src/app/icon.png` (script sharp).
2. `layout.tsx`: fonte IBM Plex Mono + `metadata.title`.
3. Sidebar + login com logo e nome "Zênite".
4. `npm run build` + verificação; fechar a #13 no banco.
