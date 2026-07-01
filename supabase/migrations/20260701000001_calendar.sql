-- ============================================================
-- Assistente Pessoal v2 — Migração 0002: Módulo Calendário
-- ============================================================

create table if not exists public.events (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  description      text,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  all_day          boolean not null default false,
  color            text not null default '#3b82f6',
  category         text,
  repeat           text not null default 'none'
                     check (repeat in ('none','daily','weekly','monthly')),
  reminder_minutes integer,             -- minutos antes p/ lembrar (null = sem)
  google_event_id  text,                -- p/ futura sync com Google Calendar
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists events_user_start_idx on public.events (user_id, starts_at);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;
drop policy if exists "own_rows" on public.events;
create policy "own_rows" on public.events for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
