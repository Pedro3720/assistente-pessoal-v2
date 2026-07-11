-- ============================================================
-- Migração 0011: Planejamento mensal (#11)
-- Cole e rode no Supabase → SQL Editor.
-- Requer transactions/categories/banks/credit_cards (migr. 0000).
-- ============================================================

create table if not exists public.planned_items (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  description    text not null,
  amount         numeric(12,2) not null default 0 check (amount >= 0),
  type           text not null check (type in ('income','expense')),
  category_id    bigint references public.categories(id) on delete set null,
  bank_id        bigint references public.banks(id) on delete set null,
  card_id        bigint references public.credit_cards(id) on delete set null,
  due_date       date not null default current_date,
  transaction_id bigint references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists planned_items_user_date_idx on public.planned_items (user_id, due_date);
drop trigger if exists planned_items_set_updated_at on public.planned_items;
create trigger planned_items_set_updated_at before update on public.planned_items
  for each row execute function public.set_updated_at();

alter table public.planned_items enable row level security;
drop policy if exists "own_rows" on public.planned_items;
create policy "own_rows" on public.planned_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
