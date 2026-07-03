-- ============================================================
-- Assistente Pessoal v2 — Migração 0006: ordem manual das tarefas
-- ============================================================

alter table public.tasks add column if not exists position int not null default 0;

-- backfill: ordem atual (mais nova primeiro) vira position 0,1,2,...
with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc) - 1 as rn
  from public.tasks
)
update public.tasks t set position = r.rn
from ranked r where r.id = t.id;

create index if not exists tasks_user_position_idx on public.tasks (user_id, position);

notify pgrst, 'reload schema';
