# Onda 1 (Marca Zênite + Fonte dos números) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear o app para "Zênite Assistente Pessoal" com a logo enviada (sidebar/login/favicon) e trocar a fonte dos números de JetBrains Mono para IBM Plex Mono.

**Architecture:** Um script Node+sharp gera os assets da logo (PNG transparente + favicon em ladrilho escuro); a UI referencia `public/logo.png` com `invert dark:invert-0` (visível nos dois temas); a fonte dos números troca via `next/font/google` no `--font-mono` (a classe `.num` já usa essa variável).

**Tech Stack:** Next.js 16.2.9 (App Router), React 19, TS strict, Tailwind v4, `next/font/google`, `sharp` (já instalado), `next/image`.

## Global Constraints

- **Projeto alvo:** `C:\Projetos\assistente-pessoal-v2` (Git Bash: `/c/Projetos/assistente-pessoal-v2`). O shell dos subagentes abre em OUTRA pasta — usar caminhos absolutos e `cd /c/Projetos/assistente-pessoal-v2 && <cmd>` sempre.
- **Branch de trabalho:** `feat/onda1-marca-fontes`. Commitar nela.
- **NÃO tocar** em `.env.local` nem `CONTEXT.md`.
- **TS strict, sem `any`.** No test framework — gate por task = **`npm run build` passa** + verificação. Commits frequentes.
- **Nome exato:** "Zênite" como marca + "Assistente Pessoal" como descritor; título da aba = "Zênite Assistente Pessoal".
- **Logo:** emblema branco; usar `invert dark:invert-0` para funcionar em tema claro e escuro.
- **UI pt-BR.** Manter `var(--font-display)` nos títulos e o `text-gradient` do login.

## Setup (uma vez)

```bash
cd /c/Projetos/assistente-pessoal-v2
git checkout main && git pull --ff-only
git checkout -b feat/onda1-marca-fontes
```

## File Structure

**Criar:**
- `scripts/gen-logo.mjs` — script Node+sharp que gera os assets.
- `public/logo.png` — logo transparente (emblema branco).
- `src/app/icon.png` — favicon (emblema em ladrilho escuro 64×64).

**Modificar:**
- `src/app/layout.tsx` — fonte IBM Plex Mono + `metadata.title`.
- `src/components/layout/sidebar.tsx` — logo + "Zênite" no bloco Brand.
- `src/app/(auth)/login/page.tsx` — logo + título "Zênite".

---

### Task 1: Gerar os assets da logo (sharp)

**Files:**
- Create: `scripts/gen-logo.mjs`, `public/logo.png`, `src/app/icon.png`

**Interfaces:**
- Produces: `public/logo.png` (referenciado como `/logo.png`), `src/app/icon.png` (favicon automático do Next).

- [ ] **Step 1: Criar `scripts/gen-logo.mjs`**

```js
import sharp from "sharp";
import https from "node:https";
import { mkdirSync } from "node:fs";

// Logo enviada pelo usuário (sugestão #15), bucket público de sugestões
const SRC =
  "https://qlqewlrzjlbwrybwrimt.supabase.co/storage/v1/object/public/suggestions/99c9c485-e0a5-4bc4-906d-4d00ad447b03/1783427682586.jpg";

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (r) => {
        if (r.statusCode !== 200) return reject(new Error("HTTP " + r.statusCode));
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

const src = await download(SRC);

// 1) logo.png transparente: alfa = luminância (preto->transparente), RGB = branco
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const rgba = Buffer.alloc(width * height * 4);
for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
  const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  rgba[j] = 255;
  rgba[j + 1] = 255;
  rgba[j + 2] = 255;
  rgba[j + 3] = lum;
}
const transparent = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();

mkdirSync("public", { recursive: true });
await sharp(transparent).toFile("public/logo.png");

// 2) favicon: emblema branco num ladrilho escuro arredondado 64x64
const emblem = await sharp(transparent)
  .resize(52, 52, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
const tile = Buffer.from(
  `<svg width="64" height="64"><rect width="64" height="64" rx="14" fill="#080b12"/></svg>`
);
await sharp(tile).composite([{ input: emblem, gravity: "center" }]).png().toFile("src/app/icon.png");

console.log("OK: public/logo.png +", `${width}x${height}`, "e src/app/icon.png 64x64");
```

- [ ] **Step 2: Rodar o script**

Run: `cd /c/Projetos/assistente-pessoal-v2 && node scripts/gen-logo.mjs`
Expected: imprime `OK: public/logo.png + 1024x1024 e src/app/icon.png 64x64`.

- [ ] **Step 3: Conferir os assets**

Run: `cd /c/Projetos/assistente-pessoal-v2 && node -e "const s=require('fs').statSync; console.log('logo', s('public/logo.png').size, 'icon', s('src/app/icon.png').size)"`
Expected: ambos > 1000 bytes (arquivos PNG válidos gerados).

- [ ] **Step 4: Commit**

```bash
git add scripts/gen-logo.mjs public/logo.png src/app/icon.png
git commit -m "feat(marca): gerar logo Zenite (png transparente) e favicon"
```

---

### Task 2: Fonte dos números (IBM Plex Mono) + título da aba

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `src/app/icon.png` (favicon automático — nada a importar).

- [ ] **Step 1: Ler `src/app/layout.tsx`** para pegar o texto exato do import de fontes, do `const jetbrainsMono = JetBrains_Mono({...})`, do `metadata` e da `<body className=...>`.

- [ ] **Step 2: Trocar JetBrains Mono por IBM Plex Mono**

No import de `next/font/google`, trocar `JetBrains_Mono` por `IBM_Plex_Mono`:

```tsx
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
```

Substituir o bloco do `jetbrainsMono` por (IBM Plex Mono exige `weight` explícito):

```tsx
// Números/valores — IBM Plex Mono (tabular, mais suave que JetBrains)
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
```

Na `<body>`, trocar `${jetbrainsMono.variable}` por `${plexMono.variable}` (mantendo `inter.variable` e `spaceGrotesk.variable`).

- [ ] **Step 3: Título da aba**

No `export const metadata`, trocar `title: "Assistente Pessoal"` por:

```tsx
  title: "Zênite Assistente Pessoal",
```

(manter os demais campos do metadata, se houver.)

- [ ] **Step 4: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro (fonte IBM Plex Mono baixada pelo next/font; sem referência restante a `jetbrainsMono`/`JetBrains_Mono`).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(marca): numeros em IBM Plex Mono e titulo Zenite (#3)"
```

---

### Task 3: Logo + nome "Zênite" na sidebar e no login

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `public/logo.png` (Task 1). `Link` e `Image` de `next/*` já são importados na sidebar; no login, adicionar o import de `Image`.

- [ ] **Step 1: Sidebar — bloco Brand**

Em `src/components/layout/sidebar.tsx`, substituir o bloco `{/* Brand */}` atual:

```tsx
        {/* Brand */}
        <div className="flex h-[72px] items-center justify-between border-b border-sidebar-border px-6">
          <span
            className="text-lg font-bold tracking-tight text-sidebar-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Assistente
          </span>
          <ThemeToggle />
        </div>
```

por:

```tsx
        {/* Brand */}
        <div className="flex h-[72px] items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-2">
            <Image src="/logo.png" alt="Zênite" width={32} height={32} className="h-8 w-8 shrink-0 invert dark:invert-0" />
            <span className="min-w-0 leading-tight">
              <span className="block text-base font-bold tracking-tight text-sidebar-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Zênite
              </span>
              <span className="block truncate text-[10px] text-sidebar-foreground/40">Assistente Pessoal</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
```

- [ ] **Step 2: Login — título com logo**

Em `src/app/(auth)/login/page.tsx`, adicionar no topo o import:

```tsx
import Image from "next/image";
```

E substituir o bloco do título:

```tsx
          <h1
            className="text-gradient text-3xl font-extrabold tracking-tighter"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Assistente Pessoal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para acessar seu painel.</p>
```

por:

```tsx
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Zênite" width={48} height={48} className="h-12 w-12 shrink-0 invert dark:invert-0" />
            <h1
              className="text-gradient text-3xl font-extrabold tracking-tighter"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Zênite
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Assistente Pessoal — entre para acessar seu painel.</p>
```

- [ ] **Step 3: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro (imports de `Image`/`Link` resolvidos).

- [ ] **Step 4: Verificação manual**

`npm run dev`: sidebar mostra a logo + "Zênite" / "Assistente Pessoal"; login mostra a logo + "Zênite"; a aba do navegador mostra "Zênite Assistente Pessoal" com o favicon; os números aparecem em IBM Plex Mono. Alternar tema claro/escuro: a logo continua visível nos dois (invertida no claro).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx src/app/\(auth\)/login/page.tsx
git commit -m "feat(marca): logo e nome Zenite na sidebar e no login (#9 #15)"
```

---

### Task 4: Verificação final + fechar a #13

**Files:** nenhum.

- [ ] **Step 1: Build de produção**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: sem erros; todas as rotas geram.

- [ ] **Step 2: Fechar a sugestão #13 (operacional — feita pelo controlador, fora do subagente)**

A sugestão #13 ("verificar onde as sugestões são armazenadas") já foi respondida (tabela `suggestions` +
bucket no Supabase). O controlador marca `status='feito'` para o id 13 usando a chave de serviço
(`SUPABASE_SECRET_KEY` do `.env.local`) via REST — NÃO é código de produto e não vai num subagente:

```bash
cd /c/Projetos/assistente-pessoal-v2
URL="https://qlqewlrzjlbwrybwrimt.supabase.co"; SECRET=$(grep -m1 '^SUPABASE_SECRET_KEY=' .env.local | sed 's/^SUPABASE_SECRET_KEY=//')
curl -s -X PATCH "$URL/rest/v1/suggestions?id=eq.13" -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"status":"feito"}' -w "HTTP %{http_code}\n"
```

Expected: `HTTP 204`.

- [ ] **Step 3: Integrar o branch**

Usar `superpowers:finishing-a-development-branch` para decidir merge/PR de `feat/onda1-marca-fontes`.

## Self-Review (autor do plano)

**Cobertura do spec:**
- Logo processada (transparente + favicon) → Task 1. ✅
- Nome/logo em sidebar + login + metadata → Tasks 2 (title) e 3 (sidebar/login). ✅
- Fonte IBM Plex Mono (#3) → Task 2. ✅
- Fechar #13 → Task 4. ✅

**Consistência de tipos/nomes:** `public/logo.png`, `src/app/icon.png`, `plexMono` (`--font-mono`), classes `invert dark:invert-0` — usados de forma consistente. `.num` já consome `--font-mono` (globals inalterado). ✅

**Placeholders:** nenhum "TBD/TODO"; todos os passos têm código/comando completo. ✅
