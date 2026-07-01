-- ============================================================
-- Assistente Pessoal v2 — Migração 0001: Módulo Finanças
-- Cole e rode no Supabase → SQL Editor.
-- Requer Authentication (Email) habilitado.
-- ============================================================

-- Função utilitária: mantém updated_at sempre atual
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── CATEGORIES ───────────────────────────────────────────
create table if not exists public.categories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  icon       text not null default '📌',
  kind       text not null check (kind in ('income','expense')),
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);
create index if not exists categories_user_idx on public.categories (user_id, kind);

-- ─── BANKS ────────────────────────────────────────────────
create table if not exists public.banks (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  icon            text not null default '🏦',
  opening_balance numeric(12,2) not null default 0,  -- saldo ao começar a usar o app
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists banks_user_idx on public.banks (user_id);
drop trigger if exists banks_set_updated_at on public.banks;
create trigger banks_set_updated_at before update on public.banks
  for each row execute function public.set_updated_at();

-- ─── CREDIT CARDS ─────────────────────────────────────────
create table if not exists public.credit_cards (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  bank_id         bigint references public.banks(id) on delete set null,
  credit_limit    numeric(12,2) not null default 0,
  opening_invoice numeric(12,2) not null default 0,  -- fatura já existente ao começar
  closing_day     smallint check (closing_day between 1 and 31),
  due_day         smallint check (due_day between 1 and 31),
  color           text not null default '#3b82f6',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists cards_user_idx on public.credit_cards (user_id);
drop trigger if exists cards_set_updated_at on public.credit_cards;
create trigger cards_set_updated_at before update on public.credit_cards
  for each row execute function public.set_updated_at();

-- ─── TRANSACTIONS ─────────────────────────────────────────
-- Regras (invariantes) aplicadas na camada de aplicação:
--   • Compra no cartão:  card_id preenchido, is_card_payment=false, bank_id NULL
--     → entra na fatura do cartão, NÃO mexe no saldo do banco.
--   • Pagamento de fatura: is_card_payment=true, card_id=cartão pago, bank_id=conta
--     → abate a fatura E reduz o saldo do banco.
--   • Transação normal:  bank_id preenchido, card_id NULL.
create table if not exists public.transactions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  description     text not null,
  amount          numeric(12,2) not null check (amount >= 0),  -- sempre positivo
  type            text not null check (type in ('income','expense')),
  category_id     bigint references public.categories(id) on delete set null,
  bank_id         bigint references public.banks(id) on delete set null,
  card_id         bigint references public.credit_cards(id) on delete set null,
  is_card_payment boolean not null default false,
  occurred_on     date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tx_user_date_idx on public.transactions (user_id, occurred_on desc);
create index if not exists tx_user_type_idx on public.transactions (user_id, type);
create index if not exists tx_user_bank_idx on public.transactions (user_id, bank_id);
create index if not exists tx_user_card_idx on public.transactions (user_id, card_id);
drop trigger if exists tx_set_updated_at on public.transactions;
create trigger tx_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — cada usuário só enxerga os próprios dados
-- ============================================================
alter table public.categories   enable row level security;
alter table public.banks        enable row level security;
alter table public.credit_cards enable row level security;
alter table public.transactions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','banks','credit_cards','transactions'] loop
    execute format('drop policy if exists "own_rows" on public.%I;', t);
    execute format(
      'create policy "own_rows" on public.%I for all to authenticated '
      || 'using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
