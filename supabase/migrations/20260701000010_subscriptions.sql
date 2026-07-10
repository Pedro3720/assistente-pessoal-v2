-- ============================================================
-- Migração 0010: Assinaturas recorrentes (#7)
-- Cole e rode no Supabase → SQL Editor.
-- Requer as tabelas categories/banks/credit_cards (migr. 0000).
-- ============================================================

create table if not exists public.subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null default '🔁',
  amount      numeric(12,2) not null default 0 check (amount >= 0),
  billing_day smallint check (billing_day between 1 and 31),
  category_id bigint references public.categories(id) on delete set null,
  bank_id     bigint references public.banks(id) on delete set null,
  card_id     bigint references public.credit_cards(id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, active);
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
drop policy if exists "own_rows" on public.subscriptions;
create policy "own_rows" on public.subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
