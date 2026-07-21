-- ============================================================
-- Agendador dos lembretes (NÃO é migração de schema — passo operacional).
-- Pré-requisitos: habilitar as extensões pg_cron e pg_net no Supabase
--   (Database → Extensions).
-- Troque <APP_URL> pela URL do app na Vercel e <CRON_SECRET> pelo segredo.
-- Rode no Supabase → SQL Editor.
-- ============================================================
select cron.schedule(
  'zenite-reminders',
  '* * * * *',  -- a cada minuto
  $$
  select net.http_post(
    url := '<APP_URL>/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para remover depois, se precisar:
--   select cron.unschedule('zenite-reminders');
