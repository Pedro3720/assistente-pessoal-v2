-- ============================================================
-- Agendador do sync da Pluggy (NÃO é migração de schema, é passo operacional).
--
-- Pré-requisitos: extensões pg_cron e pg_net habilitadas no Supabase
--   (Database → Extensions). São as mesmas já usadas pelos lembretes.
--
-- Troque <APP_URL> pela URL do app na Vercel (sem barra no fim) e
-- <CRON_SECRET> pelo mesmo valor que está no .env.local e na Vercel.
-- Rode no Supabase → SQL Editor.
--
-- Por que a cada 6 horas e não a cada minuto: quem traz a novidade na hora é o
-- webhook. Este agendamento é só a rede de segurança para entrega perdida, e
-- cada execução consulta a API da Pluggy, que é cobrada por uso.
-- ============================================================
select cron.schedule(
  'zenite-pluggy-sync',
  '0 */6 * * *',  -- a cada 6 horas, no minuto 0
  $$
  select net.http_post(
    url := '<APP_URL>/api/cron/pluggy-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Conferir os agendamentos ativos:
--   select jobid, jobname, schedule, active from cron.job;

-- Para remover depois, se precisar:
--   select cron.unschedule('zenite-pluggy-sync');
