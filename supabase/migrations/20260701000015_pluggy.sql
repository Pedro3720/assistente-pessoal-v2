-- ============================================================
-- Migração 0015: Pluggy (Open Finance) — conexões e sync automático
-- Cole e rode no Supabase → SQL Editor.
--
-- Segurança: nenhuma credencial bancária passa por aqui. Guardamos apenas o
-- itemId da conexão (identificador opaco da Pluggy) e o vínculo com as contas.
-- ============================================================

-- ─── CONEXÕES (itens da Pluggy) ─────────────────────────────
create table if not exists public.pluggy_items (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- identificador da conexão na Pluggy; único por usuário
  item_id         text not null,
  -- dados do conector só para exibir na UI (nome e imagem do banco)
  connector_id    integer,
  connector_name  text,
  connector_image text,
  status          text,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists pluggy_items_user_idx on public.pluggy_items (user_id);
-- usado pelo webhook para achar o dono do item (o webhook roda com service_role)
create index if not exists pluggy_items_item_idx on public.pluggy_items (item_id);

drop trigger if exists pluggy_items_set_updated_at on public.pluggy_items;
create trigger pluggy_items_set_updated_at before update on public.pluggy_items
  for each row execute function public.set_updated_at();

-- ─── VÍNCULO DAS CONTAS ─────────────────────────────────────
alter table public.banks add column if not exists pluggy_item_id    text;
alter table public.banks add column if not exists pluggy_account_id text;
alter table public.banks add column if not exists is_auto           boolean not null default false;
alter table public.banks add column if not exists last_synced_at    timestamptz;

-- uma conta da Pluggy só pode virar UMA conta do app (evita duplicar no re-sync)
create unique index if not exists banks_user_pluggy_account_uidx
  on public.banks (user_id, pluggy_account_id)
  where pluggy_account_id is not null;

-- ─── ORIGEM E DEDUPE DAS TRANSAÇÕES ─────────────────────────
alter table public.transactions add column if not exists external_id text;
alter table public.transactions add column if not exists source      text not null default 'manual';

-- 'manual' (digitada), 'ofx' (importada de arquivo), 'pluggy' (Open Finance)
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check
  check (source in ('manual', 'ofx', 'pluggy'));

-- CHAVE DA IDEMPOTÊNCIA: a mesma transação da Pluggy nunca entra duas vezes,
-- mesmo que o webhook e o cron rodem juntos ou que o webhook seja reentregue.
create unique index if not exists transactions_user_external_uidx
  on public.transactions (user_id, external_id)
  where external_id is not null;

-- fila "Para categorizar": transações automáticas ainda sem categoria
create index if not exists transactions_user_source_pending_idx
  on public.transactions (user_id, source)
  where category_id is null;

-- ─── RLS: cada usuário só enxerga as próprias conexões ──────
alter table public.pluggy_items enable row level security;
drop policy if exists "own_rows" on public.pluggy_items;
create policy "own_rows" on public.pluggy_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
