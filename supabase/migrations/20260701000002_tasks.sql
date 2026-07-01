-- ============================================================
-- Assistente Pessoal v2 — Migração 0003: Módulo Tarefas
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tasks (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'pending'
                check (status in ('pending','in_progress','completed')),
  priority    text not null default 'medium'
                check (priority in ('low','medium','high')),
  due_on      date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
drop policy if exists "own_rows" on public.tasks;
create policy "own_rows" on public.tasks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
