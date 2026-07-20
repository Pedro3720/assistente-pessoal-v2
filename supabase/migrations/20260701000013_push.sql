-- ============================================================
-- Migração 0013: Web Push (inscrições + dedup de lembretes)
-- Cole e rode no Supabase → SQL Editor.
-- ============================================================

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table if not exists public.notified_reminders (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('event','task')),
  ref_id      bigint not null,
  occurred_on date not null,
  sent_at     timestamptz not null default now(),
  unique (kind, ref_id, occurred_on)
);

alter table public.push_subscriptions enable row level security;
alter table public.notified_reminders enable row level security;
do $$
declare t text;
begin
  foreach t in array array['push_subscriptions','notified_reminders'] loop
    execute format('drop policy if exists "own_rows" on public.%I;', t);
    execute format(
      'create policy "own_rows" on public.%I for all to authenticated '
      || 'using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
