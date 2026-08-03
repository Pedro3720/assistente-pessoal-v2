# Onda 17: login com Google, ordem de tarefas por filtro e centralização das abas

> Spec de design. Data: 2026-07-29. Origem: 3 sugestões novas do dono, entregues por chat
> (a tabela `suggestions` estava inacessível na sessão, ver "Pendências operacionais").

## 1. Objetivo

Entregar as três sugestões novas:

1. **Login com a conta Google**, direto na tela de login, sem perder a conta atual de e-mail e senha.
2. **Reordenar tarefas com filtro ativo**, hoje possível só com a lista inteira sem filtro.
3. **Centralizar as abas** na tela, como já acontece na página de Finanças.

Não há migração SQL nesta onda.

## 2. Decisões tomadas com o dono

| Assunto | Decisão | Alternativa descartada |
|---|---|---|
| Login Google e conta atual | Botão em `/login` **mais** vinculação de identidade em `/perfil` | Só o botão, que arriscaria criar um usuário novo e vazio |
| Login Google no APK Android | Esconder o botão dentro do WebView | Mostrar sempre (erro `disallowed_useragent`) ou abrir no navegador do sistema (`@capacitor/browser`, onda própria) |
| Largura das abas centralizadas | Manter a largura de conteúdo atual de cada página e só centralizar | Padronizar tudo em 1280px, ou uma largura única intermediária |

## 3. Sugestão 3: centralização das abas

### 3.1 Diagnóstico

Só `src/app/(app)/financas/page.tsx` usa `mx-auto max-w-7xl`. As outras páginas têm largura
máxima **sem** `mx-auto`, então o conteúdo encosta na esquerda do `<main>`:

| Página | Wrapper hoje |
|---|---|
| Dashboard (`(app)/page.tsx`) | `max-w-5xl` |
| Tarefas (`tasks-view.tsx`) | `max-w-4xl` |
| Senhas (`passwords-view.tsx`) | `max-w-4xl` |
| Sugestões (page e view) | `max-w-3xl` |
| Perfil, Admin sugestões | `max-w-3xl` |
| Calendário (`calendar-view.tsx`) | nenhuma (estica sem limite) |
| Finanças | `mx-auto max-w-7xl` (o único centralizado) |

### 3.2 Desenho

Uma coluna do app definida em um lugar só, com a largura de leitura de cada página centralizada
dentro dela:

- `src/app/(app)/layout.tsx`: o div de padding recebe `mx-auto w-full max-w-7xl`. Passa a existir
  uma coluna de app de 1280px, o que também **limita o calendário**, hoje sem teto de largura.
- Cada página mantém sua largura e ganha `mx-auto`.
- Finanças **perde** o `mx-auto max-w-7xl` da página (agora é papel do layout) e fica com
  `space-y-6`. Resultado visual idêntico ao atual.
- No celular nada muda: a largura útil já é 100%. O efeito aparece de `md:` para cima.

### 3.3 Restrições

- **Não tocar** nos `flex-1` e `min-w-0` do `(app)/layout.tsx`: são a correção da sugestão #32
  (item 3.14 do HANDOFF). `mx-auto` não conflita com eles.
- Os wrappers de erro (`FinanceLoadError`, `TasksLoadError` e afins) já usam `mx-auto max-w-3xl`
  e ficam como estão.

### 3.4 Arquivos, um por um

O `mx-auto` entra no wrapper **mais externo** de cada rota. Wrapper interno de mesma largura
(caso de Sugestões e Admin) não precisa de nada: ele preenche o externo, que já está centralizado.

| Arquivo | Mudança |
|---|---|
| `src/app/(app)/layout.tsx` | div de padding ganha `mx-auto w-full max-w-7xl` |
| `src/app/(app)/page.tsx` | `max-w-5xl` -> `mx-auto max-w-5xl` |
| `src/app/(app)/financas/page.tsx` | `mx-auto max-w-7xl space-y-6` -> `space-y-6` |
| `src/app/(app)/perfil/page.tsx` | `max-w-3xl` -> `mx-auto max-w-3xl` |
| `src/app/(app)/sugestoes/page.tsx` | `max-w-3xl` -> `mx-auto max-w-3xl` (wrapper externo) |
| `src/app/(app)/admin/sugestoes/page.tsx` | `max-w-3xl` -> `mx-auto max-w-3xl` (wrapper externo) |
| `src/components/tasks/tasks-view.tsx` | `max-w-4xl` -> `mx-auto max-w-4xl` (a página não tem wrapper) |
| `src/components/passwords/passwords-view.tsx` | `max-w-4xl` -> `mx-auto max-w-4xl` (idem) |
| `src/components/calendar/calendar-view.tsx` | nada. Não tem largura própria, e quem passa a limitar é a coluna do layout |

`components/suggestions/suggestions-view.tsx` e `admin-suggestions-view.tsx` ficam **inalterados**
(wrappers internos).

## 4. Sugestão 2: reordenar tarefas com filtro ativo

### 4.1 Diagnóstico

`tasks-view.tsx` bloqueia explicitamente: `const canReorder = filter === "all" && catFilter === "all"`.
Com isso a alça de arrastar desaparece e o `useSortable` fica `disabled`.

A coluna `tasks.position` (migração 0006) é uma **ordem global por usuário**, e `getTasks` ordena
por `position` e depois `created_at desc`. Por isso o problema se resolve sem migração.

### 4.2 Regra de negócio

Arrastar dentro de um filtro permuta **apenas as posições que os itens visíveis já ocupavam** na
ordem global. Quem está escondido pelo filtro não muda de lugar.

```
antes:  [0]Trab  [1]Casa-A  [2]Trab  [3]Casa-B  [4]Casa-C  [5]Trab
filtro: categoria Casa  ->  visíveis nos slots 1, 3, 4
ação:   arrastar Casa-C para o topo da lista filtrada
depois: [0]Trab  [1]Casa-C  [2]Trab  [3]Casa-A  [4]Casa-B  [5]Trab
```

A alça passa a aparecer com **qualquer** filtro ativo, inclusive o de status, não só o de
categoria. É a mesma mecânica e evita a inconsistência de "arrasta em Casa mas não arrasta em
Pendentes".

### 4.3 Desenho

- Função pura nova em `src/lib/tasks/reorder.ts`:

  ```ts
  reorderWithinFilter(order: Task[], shown: Task[], activeId: number, overId: number): Task[] | null
  ```

  - acha os índices de `activeId` e `overId` dentro de `shown`;
  - aplica `arrayMove` em `shown`;
  - escreve o resultado de volta nos mesmos slots que `shown` ocupava em `order`;
  - **valida** que a saída tem exatamente o mesmo conjunto de ids da entrada, sem perda nem
    duplicação. Se não tiver, devolve `null` e o componente aborta sem salvar;
  - devolve `null` também quando não há o que fazer (id ausente, ou origem igual ao destino).

- `tasks-view.tsx`: remove `canReorder` (a alça sempre aparece, `useSortable` nunca fica
  `disabled`), e `onDragEnd` passa a chamar `reorderWithinFilter(order, shown, ...)`. Persistência
  segue no `reorderTasks` que já existe, com a lista global completa. Comportamento otimista e
  reversão em erro (`setOrder(tasks)` mais `toast.error`) ficam como hoje.
- Nada muda em `src/lib/actions/task.ts`, na validação Zod (`reorderInput`) nem no banco.

### 4.4 Restrições

- Regra de negócio fora do JSX, conforme a seção 5 do HANDOFF.
- `createTask` continua nascendo no topo (`position = min - 1`); o `reorderTasks` reescreve
  `0..N-1` em seguida, então empates de `position` não acontecem.

## 5. Sugestão 1: login com Google

### 5.1 Escopo e o que NÃO é

O Google Auth é independente do Google Calendário que já existe: o Calendário tem OAuth próprio,
com tokens em `google_accounts` (migração 0004) e rotas `/api/google/*`, e **continua intacto**.
Vincular o login não conecta a agenda, e conectar a agenda não cria login. Unificar os dois seria
outra onda.

### 5.2 Fluxo A: entrar (`/login`)

- Componente cliente novo `src/components/auth/google-button.tsx`, usando o cliente de navegador
  que já existe (`src/lib/supabase/client.ts`):

  ```ts
  signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/`,
      queryParams: { prompt: "select_account" },
    },
  })
  ```

- O botão fica **fora** do `<form>` da página de login. Dentro dele, um clique submeteria o login
  por senha.
- **Precisa ser navegação do cliente, não Server Action com `redirect`.** A CSP da Onda 10 tem
  `form-action 'self'`, e o Chrome aplica essa diretiva à cadeia de redirect após um submit de
  formulário: um redirect para `accounts.google.com` saindo de Server Action seria bloqueado pelo
  navegador. `window.location` não passa por `form-action`.
- Sem mudança na CSP: o fluxo é redirect de página (não é `fetch`), e a troca do código acontece
  no domínio do Supabase, já liberado em `connect-src`.

### 5.3 Fluxo B: vincular (`/perfil`)

Seção "Conta Google" (componente cliente novo `src/components/profile/google-identity.tsx`) com
`getUserIdentities`, `linkIdentity` e `unlinkIdentity`, todos confirmados no `@supabase/auth-js`
instalado (não na documentação web).

- Sem identidade Google: texto "não vinculada" e botão **Vincular**, que chama
  `linkIdentity({ provider: "google", options: { redirectTo: ".../api/auth/callback?next=/perfil" } })`.
- Com identidade: mostra o e-mail vinculado e botão **Desvincular**.
- Recusa desvincular a **única** identidade da conta, com mensagem própria em vez do erro cru do
  Supabase (senão o dono poderia se trancar fora).

Vincular antes de usar o botão de login é o que garante que o Google caia no **mesmo `user_id`**.
Todos os dados do app são por `user_id`; um usuário novo abriria o app vazio.

### 5.4 Callback e perfil

`src/app/api/auth/callback/route.ts` já troca o código por sessão e valida o `next` contra open
redirect. Ganha uma chamada a `ensureProfile()` novo (`src/lib/auth/ensure-profile.ts`), executado
depois do `exchangeCodeForSession`:

- **Nome:** o gatilho `handle_new_user` (migração 0005) lê `display_name` do metadata, e o Google
  manda `full_name` e `name`. Sem tratamento, um usuário criado pelo Google cairia no app com a
  saudação vazia. O `ensureProfile` preenche `display_name` quando estiver nulo, usando
  `full_name`, depois `name`, depois a parte local do e-mail.
- **Foto:** o Google manda a URL do `googleusercontent.com` em `avatar_url`, e a CSP
  (`img-src 'self' data: blob: <supabase>`) barraria a imagem, deixando avatar quebrado. O
  `ensureProfile` **descarta** `avatar_url` que não seja do nosso Storage do Supabase. Trocar isso
  por liberar o domínio na CSP é uma linha no `next.config.ts`, e fica como opção do dono, não
  como padrão.
- É idempotente: em conta já existente e com perfil completo, não escreve nada.
- Não altera o fluxo de recuperação de senha, que usa o mesmo callback com `next` default
  `/redefinir-senha`.

### 5.5 APK Android (WebView)

O Google recusa OAuth em WebView (`disallowed_useragent`), como o HANDOFF já registra na seção 3.9.
A decisão é esconder o botão lá, **resolvido no servidor**: `/login` é página dinâmica (usa
`searchParams`), então lê o `user-agent` via `headers()` e simplesmente não renderiza o botão. Sem
flash e sem descasamento de hidratação.

Detector em `src/lib/auth/webview.ts`, com dois sinais:

1. token de UA próprio, adicionado em `capacitor.config.ts` (`appendUserAgent: "ZeniteApp"`).
   Determinístico, mas só vale a partir do próximo APK gerado;
2. heurístico `; wv)` do WebView do Android, que cobre o APK já instalado hoje.

### 5.6 Interruptor de segurança

Enquanto o provider não estiver ligado no Supabase, o botão retornaria erro. Por isso ele só é
renderizado quando `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1`. O dono liga a env quando terminar a
configuração, sem precisar de deploy de código.

### 5.7 Arquivos

Novos: `src/components/auth/google-button.tsx`, `src/components/profile/google-identity.tsx`,
`src/lib/auth/ensure-profile.ts`, `src/lib/auth/webview.ts`.
Alterados: `src/app/(auth)/login/page.tsx`, `src/app/(app)/perfil/page.tsx`,
`src/app/api/auth/callback/route.ts`, `capacitor.config.ts`.

### 5.8 Erros e limites

- Falha no `signInWithOAuth` (provider desligado, rede): `toast.error` com a mensagem do Supabase.
- Falha no callback: já cai em `/login?error=Link inválido ou expirado`.
- O rate limiting por IP da Onda 12 **não** cobre este fluxo, porque o início do OAuth é navegação
  do cliente, não Server Action. Quem limita é o próprio Supabase Auth. Aceito e registrado.

## 6. Validação

- `npm run build` a cada tarefa (não há framework de testes no projeto).
- Centralização: medir no navegador a 375px, 390px e 1280px, conferindo coluna centralizada e
  `overflow` horizontal igual a 0.
- Ordem de tarefas: com filtro de categoria e com filtro de status, conferir que a alça aparece,
  que arrastar reordena, e que ao limpar o filtro a ordem relativa dos itens escondidos não mudou.
- Login Google: **não é exercitável na sessão de implementação** (exige provider configurado e
  sessão real do Google). Roteiro de validação do dono na seção 7.
- Varredura final `rg "—|–" src` (regra do `CLAUDE.md`).

## 7. Ação do dono

1. **Google Cloud**, no cliente válido (`...n254m80n...`): adicionar o redirect
   `https://qlqewlrzjlbwrybwrimt.supabase.co/auth/v1/callback`.
2. **Supabase, Authentication:** ligar o provider **Google** com o Client ID e o Secret desse
   cliente; ligar **Manual linking** (é o que habilita o Vincular do `/perfil`); conferir a
   allowlist de **Redirect URLs** com `…/api/auth/callback` de produção e de `localhost:3000`
   (mesma pendência antiga do item 5 da seção 4 do HANDOFF).
3. **Vercel e `.env.local`:** setar `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1` quando quiser ligar o botão.
4. **Testar, nesta ordem:** entrar com e-mail e senha, ir em `/perfil`, vincular o Google, sair,
   entrar com Google e **confirmar que seus dados aparecem**. Dados visíveis é a prova de que caiu
   no mesmo `user_id`, e não numa conta nova.
5. Conferir no app a centralização das abas e a reordenação de tarefas com filtro.

## 8. Pendências operacionais

- A tabela `suggestions` não pôde ser lida na sessão (o classificador de segurança do harness
  ficou indisponível, bloqueando o MCP do Supabase e o Bash). As três sugestões vieram por chat.
  Quando o acesso voltar, marcar as três como "feito" em `/admin/sugestoes`, junto com as
  pendências antigas do item 4 da seção 4 do HANDOFF (excluir #19 e #22, marcar as entregues).
- Mesma indisponibilidade pode impedir `git commit` e `npm run build` durante a implementação. Se
  isso acontecer, o que não foi verificado tem que ser dito explicitamente, nunca presumido.

## 9. Fora de escopo

- Login Google funcionando **dentro** do APK (precisa de `@capacitor/browser` mais deep link).
- Unificar a identidade de login com os tokens do Google Calendário.
- Liberar `googleusercontent.com` na CSP para exibir a foto do Google.
- Ordem por categoria persistida em coluna própria (exigiria migração e não é o que foi pedido).
