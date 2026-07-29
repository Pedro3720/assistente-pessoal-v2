-- ============================================================
-- Migração 0016: correção da 0015 (Pluggy)
-- Cole e rode no Supabase → SQL Editor.
--
-- Por que existe: a tabela pluggy_items acabou criada sem as colunas
-- connector_id e connector_image, o que fazia a conexão falhar com
-- "Could not find the 'connector_id' column of 'pluggy_items'".
--
-- Este bloco é IDEMPOTENTE e reafirma toda a estrutura da 0015: pode ser
-- rodado quantas vezes quiser, e conserta o que faltar sem tocar no que já
-- está certo. Nenhum dado é apagado.
-- ============================================================

-- ─── COLUNAS QUE FALTARAM EM pluggy_items ───────────────────
alter table public.pluggy_items add column if not exists connector_id    integer;
alter table public.pluggy_items add column if not exists connector_name  text;
alter table public.pluggy_items add column if not exists connector_image text;
alter table public.pluggy_items add column if not exists status          text;
alter table public.pluggy_items add column if not exists last_synced_at  timestamptz;
alter table public.pluggy_items add column if not exists created_at      timestamptz not null default now();
alter table public.pluggy_items add column if not exists updated_at      timestamptz not null default now();

-- ─── CHAVES E ÍNDICES ───────────────────────────────────────
-- unique (user_id, item_id): o upsert da aplicação depende dele
create unique index if not exists pluggy_items_user_item_uidx
  on public.pluggy_items (user_id, item_id);
create index if not exists pluggy_items_user_idx on public.pluggy_items (user_id);
create index if not exists pluggy_items_item_idx on public.pluggy_items (item_id);

-- ─── TRIGGER DE updated_at ──────────────────────────────────
drop trigger if exists pluggy_items_set_updated_at on public.pluggy_items;
create trigger pluggy_items_set_updated_at before update on public.pluggy_items
  for each row execute function public.set_updated_at();

-- ─── COLUNAS DE VÍNCULO E DEDUPE (reafirmação) ──────────────
alter table public.banks add column if not exists pluggy_item_id    text;
alter table public.banks add column if not exists pluggy_account_id text;
alter table public.banks add column if not exists is_auto           boolean not null default false;
alter table public.banks add column if not exists last_synced_at    timestamptz;

create unique index if not exists banks_user_pluggy_account_uidx
  on public.banks (user_id, pluggy_account_id)
  where pluggy_account_id is not null;

alter table public.transactions add column if not exists external_id text;
alter table public.transactions add column if not exists source      text not null default 'manual';

alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check
  check (source in ('manual', 'ofx', 'pluggy'));

create unique index if not exists transactions_user_external_uidx
  on public.transactions (user_id, external_id)
  where external_id is not null;

create index if not exists transactions_user_source_pending_idx
  on public.transactions (user_id, source)
  where category_id is null;

-- ─── RLS (reafirmação) ──────────────────────────────────────
alter table public.pluggy_items enable row level security;
drop policy if exists "own_rows" on public.pluggy_items;
create policy "own_rows" on public.pluggy_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
