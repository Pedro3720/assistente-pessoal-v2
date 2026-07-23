-- ============================================================
-- Assistente Pessoal v2 — Migração 0014: Categorias de Tarefas (#29)
-- ============================================================

create table if not exists public.task_categories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null default '#3b82f6',
  created_at timestamptz not null default now()
);
create index if not exists task_categories_user_idx on public.task_categories (user_id);

alter table public.task_categories enable row level security;
drop policy if exists "own_rows" on public.task_categories;
create policy "own_rows" on public.task_categories for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- vínculo opcional na tarefa; excluir a categoria só desvincula (não apaga a tarefa)
alter table public.tasks
  add column if not exists category_id bigint references public.task_categories(id) on delete set null;
create index if not exists tasks_category_idx on public.tasks (category_id);

notify pgrst, 'reload schema';
