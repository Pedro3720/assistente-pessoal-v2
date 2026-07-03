# Melhorias v3 — Tarefas rápidas, avatar, cartão parcelado, modal, sugestões, categorias, Google

**Data:** 2026-07-03
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase / TS strict)
**Status:** Aprovado — pronto para o plano de implementação

> Segue os padrões do projeto: Server Components leem (`lib/data/*`), Server Actions mutam
> (`lib/actions/*`, "use server", validam Zod, injetam `user_id` via `auth.getUser()`, `revalidatePath`),
> tipos em `types/*`, Zod em `lib/validation/*`, RLS `own_rows`, componentes pequenos, camada visual
> (glass/card-glow, `.num`, `Reveal`, `CountUp`). Migrações aplicadas MANUALMENTE no SQL Editor do Supabase.

## 1. Objetivo (itens 3–10 do pedido)

- **#3** Marcar concluída / excluir tarefa sem lentidão (UI otimista).
- **#4** Corrigir erro ao enviar foto de perfil do PC.
- **#5** Editar informações do cartão de crédito.
- **#6** Cartão com parcelamento: **Fatura a pagar (mês)**, **Em aberto (não deste mês)**, **Utilizado total**, **Limite total** e **Limite disponível**.
- **#7** Corrigir modal de nova transação que aparece atrás dos outros cards.
- **#8** Aba de Sugestões de melhorias (texto + print), registro no app.
- **#9** Google Calendar: permitir escolher a conta (verificação — código já força o seletor).
- **#10** Criar/editar/excluir categorias de receita e despesa.

## 2. Fora de escopo (YAGNI)

- Notificação/e-mail de sugestões (decidido: só registro no app).
- Relatórios de parcelas futuras além do necessário para os 5 valores do cartão.
- Refatorações não relacionadas.

## 3. Peças compartilhadas (criadas uma vez, reusadas)

### 3.1 `Modal` com portal — `src/components/ui/modal.tsx` (client)
Componente que renderiza o conteúdo em `createPortal(document.body)` com overlay `fixed inset-0 z-50`,
backdrop e fechar no clique fora / ESC. **Motivo:** os cards usam `<Reveal>` (transform GSAP) e `glass`
(backdrop-filter), que criam containing/stacking context e prendem `position: fixed`. O portal escapa disso.
Usado em: Nova Transação (#7), edição de cartão (#5), gerenciador de categorias (#10).

```
export function Modal({ onClose, children, title }: { onClose: () => void; children: React.ReactNode; title?: string })
```

### 3.2 `resizeImage` — `src/lib/images.ts` (client util)
Reduz uma imagem no navegador antes do upload (avatar #4 e prints #8):

```
// desenha em canvas com lado máx. `max` (px), exporta JPEG (qualidade `q`) como File
export async function resizeImage(file: File, max = 512, q = 0.85): Promise<File>
```

Usada no `AvatarPicker` e no formulário de sugestões. Escreve o `File` reduzido de volta no
`<input type="file">` via `DataTransfer` (mantém o envio por form nativo).

### 3.3 `next.config.ts` — limite de Server Action
Adicionar `experimental.serverActions.bodySizeLimit: "4mb"` como margem (o redimensionamento já deixa
os arquivos pequenos; isto evita 413 em casos extremos). Manter o `images.remotePatterns` existente.

## 4. Design por item

### #3 — Tarefas otimistas (`src/components/tasks/tasks-view.tsx`)
`toggle` e `remove` hoje fazem `await action()` + `router.refresh()` (2 idas ao servidor antes de a UI mudar).
Trocar por **otimista** sobre o estado local `order`:
- `toggle(t)`: atualiza `status` do item em `order` na hora; chama `setTaskStatus` em background;
  em erro, `toast` + reverte para `tasks` + `router.refresh()`.
- `remove(id)`: remove de `order` na hora; chama `deleteTask` em background; em erro, reverte.
- Não bloquear a UI no `router.refresh()`; a ressincronização já ocorre via o `useEffect([orderKey])` existente.

### #4 — Upload de foto (`src/components/profile/avatar-picker.tsx` + `next.config.ts`)
Causa: arquivo cru enviado pela Server Action (limite padrão 1MB) → 413 → "unexpected response".
- `onFile` passa a ser `async`: `const small = await resizeImage(f)`, grava `small` no `<input type="file">`
  via `DataTransfer`, e usa `URL.createObjectURL(small)` no preview.
- Nada muda no `profile-form`/`cadastro-form` nem na action (o `avatar_file` já chega pequeno).
- `bodySizeLimit: "4mb"` no `next.config.ts` (margem).
- O bucket `avatars` e as políticas já existem (verificado). Sem mudança de banco.

### #5 — Editar cartão (`src/components/finance/card-manager.tsx`)
`updateCard` já existe em `lib/actions/finance.ts`. Adicionar botão de editar (lápis) por cartão que
reabre o formulário de cartão preenchido (mesmos campos: nome, banco, limite, fatura inicial, fechamento,
vencimento, cor). No `save`, se `editingId` → `updateCard(id, input)`; senão `createCard`. Reusar o
formulário já existente (extrair para modo criar/editar).

### #6 — Cartão parcelado + 5 valores
**Migração `20260701000007_tx_installments.sql`:**
```
alter table public.transactions add column if not exists purchase_group uuid;
alter table public.transactions add column if not exists installments  int not null default 1;
alter table public.transactions add column if not exists installment_no int not null default 1;
create index if not exists tx_purchase_group_idx on public.transactions (purchase_group);
notify pgrst, 'reload schema';
```

**Tipos/validação:** `Transaction` ganha `purchase_group: string | null; installments: number; installment_no: number`.
Novo `installmentInput` (Zod) = campos da transação + `installments: z.number().int().min(1).max(48)`.

**Criação parcelada (`lib/actions/finance.ts` → `createInstallmentPurchase`):**
Só para compra no cartão (`type=expense`, `card_id` set, `is_card_payment=false`). Se `installments>1`:
- Gera `purchase_group = crypto.randomUUID()`.
- Valor de cada parcela = `Math.round(total/ N * 100)/100`; a **última** absorve a diferença de centavos.
- Mês de fatura da parcela `k` = mês de fatura da compra + (k−1) meses. Mês de fatura da compra =
  mês de `occurred_on` se `dia(occurred_on) ≤ closing_day`, senão mês seguinte (usa `shiftMonth`;
  se o cartão não tem `closing_day`, usa o próprio mês). `occurred_on` de cada parcela = dia 1 do seu
  mês de fatura (ou o dia original limitado ao último dia do mês).
- `bank_id=null`, `is_card_payment=false`, `installment_no=k`, `installments=N`,
  descrição `"<desc> (k/N)"`, todos com o mesmo `purchase_group`. Insere as N linhas.
- `installments=1` → cai no `createTransaction` normal.

**Edição/exclusão de compra parcelada (MVP, sem ambiguidade):**
- **Excluir** qualquer parcela de um grupo → nova action `deleteTransactionGroup(purchase_group)` remove
  **todas** as linhas do grupo (a lista mostra confirmação "excluir a compra parcelada inteira").
- **Editar** uma parcela → altera **apenas aquela linha** (descrição/valor/data), sem re-expandir o grupo.
  Mudar nº de parcelas ou o valor total = excluir a compra e recriar (não há edição estrutural no MVP).
- Transações sem `purchase_group` (à vista/1x) seguem o comportamento atual.

**Cálculo dos valores (`lib/data/finance.ts`, por cartão):**
Seja `curMonth` o mês corrente (SP). Para cada cartão:
- `utilizado_total` = `opening_invoice` + Σ(parcelas de compra no cartão, qualquer mês) − Σ(pagamentos). Mín. 0.
- `fatura_mes` (a pagar este mês) = `opening_invoice` + Σ(parcelas com mês de fatura **≤ curMonth**) − Σ(pagamentos). Mín. 0.
- `em_aberto` (não deste mês) = `utilizado_total` − `fatura_mes` (parcelas de meses futuros).
- `disponivel` = `credit_limit` − `utilizado_total`.
Tipo `CardWithInvoice` passa a expor `{ fatura_mes, em_aberto, utilizado_total, disponivel, credit_limit }`
(mantém `invoice = fatura_mes` para compatibilidade onde já é usado, ex. seleção de pagamento e dashboard).

**Exibição (`card-manager.tsx`):** por cartão —
- **Fatura a pagar (este mês)** em destaque (`fatura_mes`).
- Linha: **Em aberto** `em_aberto` · **Utilizado** `utilizado_total`.
- Barra de uso = `utilizado_total / credit_limit`.
- Rodapé: **Disponível** `disponivel` · **Limite total** `credit_limit`.

**Formulário de transação (`transactions-section.tsx`):** quando for compra no cartão
(despesa + cartão + não é pagamento), mostrar campo **"Parcelas"** (número, default 1). No `save`,
`installments>1` → `createInstallmentPurchase`; senão fluxo atual.

### #7 — Modal de transação via portal (`transactions-section.tsx`)
Trocar o `<div className="fixed inset-0 z-50 …">` inline pelo componente `Modal` (§3.1), que porta para
`body`. O corpo do formulário fica igual. Resolve o modal aparecer atrás dos cards.

### #8 — Aba de Sugestões
**Migração `20260701000008_suggestions.sql`:** tabela `suggestions`
(`id`, `user_id`, `title text`, `description text`, `image_url text`, `status text default 'aberto'
check in ('aberto','feito')`, `created_at`, `updated_at` + trigger), RLS `own_rows`, índice `user_id`.
Bucket público `suggestions` (leitura pública; escrita/atualização só na pasta `{user_id}/`), políticas
análogas às de `avatars`.
**Tipos/validação/data/actions:** `types/suggestion.ts`; `lib/validation/suggestion.ts`
(`title` obrigatório, `description`, `image_url?`); `lib/data/suggestion.ts` (`getSuggestions`);
`lib/actions/suggestion.ts` (`createSuggestion(formData)` com upload do print via `uploadAvatarFile`
generalizado para bucket-alvo, `setSuggestionStatus`, `deleteSuggestion`).
**Storage helper:** generalizar `lib/storage/avatar.ts` → `lib/storage/upload.ts`
`uploadImageFile(supabase, bucket, userId, file)` (o avatar passa a chamar com bucket `avatars`).
**UI:** item **"Sugestões"** na sidebar (`layout/sidebar.tsx`, ícone `Lightbulb`); rota
`src/app/(app)/sugestoes/page.tsx` (Server Component lê `getSuggestions`) + `components/suggestions/*`
(form com título, descrição, print opcional [usa `resizeImage`], e lista com status e ação "marcar feito").

### #9 — Google escolher conta (verificação)
`api/google/connect/route.ts` **já** envia `prompt: "select_account consent"` (força o seletor). Portanto:
- Verificar que a versão publicada tem esse código e que `GOOGLE_REDIRECT_URI` (Vercel) aponta para o
  callback de produção (`https://<dominio>/api/google/callback`) e está autorizado no Google Cloud.
- Se, com o código correto, ainda conectar direto, investigar sessão Google/estado no navegador.
- Nenhuma reescrita prevista além de garantir `select_account consent` (já presente). Item majoritariamente
  de **verificação/config**; o plano trata como diagnóstico, não como feature.

### #10 — CRUD de categorias
`createCategory`/`deleteCategory` já existem. Adicionar **`updateCategory(id, raw)`** em
`lib/actions/finance.ts` (`categoryInput.partial()`). UI: **gerenciador de Categorias** em `Modal` (§3.1),
aberto por um botão na página de Finanças (perto de "Despesas por categoria"): lista as categorias
separadas por tipo (receita/despesa), permite criar (nome + ícone + tipo), renomear/trocar ícone e excluir.
`components/finance/category-manager.tsx`. Excluir categoria em uso: conferir no schema de `transactions`
se `category_id` é `on delete set null`. Se for, `deleteCategory` funciona como está (transações ficam
sem categoria). Se **não** for, `deleteCategory` primeiro faz `update transactions set category_id=null
where category_id=id` (do próprio usuário) e depois exclui — para não falhar por FK.

## 5. Segurança
- Novas tabelas com RLS `own_rows`; buckets com escrita restrita a `{user_id}/`.
- Actions validam Zod e usam `auth.getUser()` (nunca `user_id` do cliente).
- Sem novas chaves no browser; `.env.local` intocado.

## 6. Verificação (rodar `npm run dev` + `npm run build`)
- #3 tarefa marca/exclui instantâneo; #4 foto do PC sobe sem erro; #5 editar cartão persiste;
  #6 compra 6x → R$ correto em Fatura/Em aberto/Utilizado/Disponível; #7 modal por cima;
  #8 criar sugestão com print e marcar feito; #9 seletor de conta aparece; #10 criar/renomear/excluir categoria.
- `npm run build` sem erro de tipo.

## 7. Passos manuais do usuário (Supabase SQL Editor)
1. `20260701000007_tx_installments.sql`
2. `20260701000008_suggestions.sql` (tabela + bucket `suggestions` + políticas)
3. (#9) Conferir `GOOGLE_REDIRECT_URI` de produção na Vercel + redirect autorizado no Google Cloud.

## 8. Ordem sugerida de implementação
1. Peças compartilhadas: `Modal` (portal), `resizeImage`, `bodySizeLimit`.
2. #7 modal via portal (usa `Modal`).
3. #3 tarefas otimistas.
4. #4 avatar resize.
5. #5 editar cartão.
6. #10 categorias (CRUD + gerenciador).
7. #6 parcelamento + 5 valores do cartão (migração + action + data + UI).
8. #8 sugestões (migração + storage + página).
9. #9 verificação do Google.
10. `npm run build` + verificação visual completa.
