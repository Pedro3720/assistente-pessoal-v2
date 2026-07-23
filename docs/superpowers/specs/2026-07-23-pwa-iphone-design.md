# Spec — Transformar o Zênite em app de iPhone (PWA)

**Data:** 2026-07-23
**Autor:** brainstorm com o dono do projeto.
**Objetivo:** rodar o Zênite como um app na **tela inicial do iPhone**, com cara de nativo,
reusando o site atual.

## 1. Contexto e decisão

- Uso pessoal. O dono quer o app **instalado na tela inicial** (não App Store por enquanto).
- Restrição dura: **sem Mac e sem conta Apple Developer**. Isso inviabiliza hoje qualquer app
  nativo iOS (build exige macOS/Xcode; instalar em iPhone real exige a conta paga).
- **Decisão: PWA (Progressive Web App).** É o único caminho que chega ao iPhone sem Mac/conta,
  reusa 100% do código atual, e vocês já têm metade pronto (service worker + web push, HTTPS na
  Vercel, logo/ícone).
- **Menor arrependimento:** um PWA pode depois ser embrulhado no **Capacitor** para App Store
  reusando quase tudo. Uma reescrita React Native jogaria fora a UI atual (Tailwind/GSAP/DOM).

## 2. Não-objetivos (agora)

- Publicar na App Store (fica para uma Fase 4 futura, só se houver Mac + conta Apple).
- Reescrita nativa (React Native/Swift).
- Deixar os dados (finanças/tarefas/calendário) totalmente offline: dependem do Supabase e de
  auth. O offline se limita ao "shell" do app e a um fallback amigável sem rede.

## 3. Arquitetura (o que um PWA exige neste Next.js 16)

Stack atual relevante: Next 16 App Router, hospedado na Vercel (HTTPS ok), `metadata` em
`src/app/layout.tsx`, `public/sw.js` (só push, registrado pelo `NotificationsSetup`),
`src/app/icon.png` + `public/logo.png`, `scripts/gen-logo.mjs` (sharp).

Um PWA "de verdade" precisa de: (a) **Web App Manifest**, (b) **ícones e meta tags da Apple**
(o iOS ignora parte do manifest), (c) **service worker** com cache do shell, (d) dica de
instalação para iOS (Safari não tem prompt automático).

## 4. Fases

### Fase 1 — PWA instalável (MVP, coloca na tela inicial)
- `src/app/manifest.ts` (rota de manifest do Next): `name`, `short_name`, `display: "standalone"`,
  `start_url: "/"`, `theme_color`, `background_color`, `icons` (192, 512, 512 maskable).
- Metadados Apple via `metadata`/`viewport` do Next em `layout.tsx`: `appleWebApp`
  (`capable: true`, `statusBarStyle`, `title`), `apple-touch-icon` 180x180, `themeColor` por tema,
  `viewport` com `viewportFit: "cover"`.
- **Gerar o conjunto de ícones** estendendo `scripts/gen-logo.mjs` (sharp): 192, 512, 512-maskable
  (com padding de safe zone), apple-touch 180. Saída em `public/icons/`.
- **Banner de instalação para iOS:** componente que aparece só em iOS Safari fora do modo
  standalone, explicando "Compartilhar → Adicionar à Tela de Início". Dispensável e lembrado em
  `localStorage` (padrão do `NotificationBanner` atual).
- **Resultado:** abre em tela cheia, sem barra do Safari, com ícone próprio.

### Fase 2 — Offline + service worker unificado
- **Risco central:** só pode haver **um** SW por escopo. O `public/sw.js` atual só faz push;
  não dá para registrar um segundo SW de cache por cima. Solução: **unificar push + cache num SW
  só**, provavelmente migrando para **Serwist** (`@serwist/next`, sucessor do Workbox no Next),
  reimplementando os handlers de push (`push`, `notificationclick`) dentro do SW do Serwist.
- Precache do shell (documento, JS/CSS, ícones) + `runtimeCaching` para assets estáticos.
- Página de **fallback offline** (`/offline`) quando sem rede.
- Não cachear respostas autenticadas do Supabase nem Server Actions.

### Fase 3 — Acabamento "cara de nativo"
- **Splash screens** de abertura por tamanho de tela (links `apple-touch-startup-image`), geradas
  também pelo script de ícones.
- **Safe areas** (notch / Dynamic Island): `env(safe-area-inset-*)` no layout/sidebar/headers,
  já com `viewport-fit=cover` da Fase 1.
- Polimento standalone: travar bounce/overscroll, `-webkit-touch-callout`, cor de status bar por
  tema, comportamento sem botão "voltar" do navegador.
- **Validar push no PWA instalado** (iOS 16.4+ só permite push depois de adicionar à tela inicial).
- **Opcional:** Face ID no cofre de Senhas via WebAuthn (autenticador de plataforma), gating a
  revelação de senhas.

### Fase 4 — Futuro (só com Mac + conta Apple Developer)
- Embrulhar o PWA no **Capacitor** para App Store: push nativo (APNs), biometria nativa, etc.
  Reusa quase toda a Fase 1 a 3. Fora de escopo agora.

## 5. Validação
- `npm run build` a cada mudança.
- Verificação no preview: simular standalone e checar manifest/ícones/SW pelas ferramentas do
  navegador (o painel pode travar; usar leitura de DOM/JS como nas ondas anteriores).
- **Validação final é no iPhone do dono** (Safari iOS não é testável por aqui): instalar na tela
  inicial, abrir em tela cheia, checar ícone, splash, push e offline.

## 6. Riscos e mitigações
- **iOS Safari é limitado:** sem prompt de instalação (mitigado pela dica manual), push só pós
  instalação (documentar no fluxo), storage volátil (não confiar em cache para dados sensíveis).
- **Unificar o SW de push com cache** (Fase 2) é a parte mais delicada: fazer com o push já
  validado, com rollback fácil (a Fase 1 não depende disso).
- **Ícones/splash** precisam do logo em boa resolução: reusar o pipeline do `gen-logo.mjs`.
