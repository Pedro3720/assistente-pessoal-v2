-- ============================================================
-- Assistente Pessoal v2, migração 0020: horário e lembrete na tarefa (Onda 21)
-- ============================================================

alter table public.tasks
  add column if not exists due_time         time,
  add column if not exists reminder_minutes integer;

-- faixa igual à do evento (0 = "na hora", 1440 = "1 dia antes")
alter table public.tasks drop constraint if exists tasks_reminder_minutes_range;
alter table public.tasks
  add constraint tasks_reminder_minutes_range
  check (reminder_minutes is null or (reminder_minutes >= 0 and reminder_minutes <= 1440));

-- o cron varre só as tarefas que têm lembrete de verdade
create index if not exists tasks_reminder_idx on public.tasks (due_on)
  where due_time is not null and reminder_minutes is not null;

notify pgrst, 'reload schema';
