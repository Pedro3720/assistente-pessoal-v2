-- ============================================================
-- Assistente Pessoal v2 — Auditoria de RLS (Nível 2 de segurança)
-- Cole e rode no Supabase -> SQL Editor.
--
-- Parte 1: RELATÓRIO. Lista toda tabela do schema public, se o RLS está
--          ligado e quantas policies tem. Qualquer linha com rls_ativa = false
--          ou qtd_policies = 0 é um BURACO (tabela sem isolamento por usuário).
-- Parte 2: GARANTIA idempotente. Reafirma RLS + policy "own_rows" em todas as
--          tabelas de dados do usuário, usando EXATAMENTE a mesma definição das
--          migrações. Não enfraquece nada; só preenche o que faltar.
-- ============================================================

-- ─── Parte 1: relatório de auditoria ──────────────────────
select
  c.relname             as tabela,
  c.relrowsecurity      as rls_ativa,
  c.relforcerowsecurity as rls_forcada,
  coalesce(p.n, 0)      as qtd_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (select polrelid, count(*) n from pg_policy group by polrelid) p
  on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;

-- ─── Parte 2: garantir RLS + own_rows (idempotente) ───────
do $$
declare t text;
begin
  -- Tabelas cujo dono é a coluna user_id (= auth.uid()).
  foreach t in array array[
    'categories','banks','credit_cards','transactions','events','tasks',
    'task_categories','passwords','google_accounts','suggestions',
    'subscriptions','planned_items','push_subscriptions','notified_reminders'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own_rows" on public.%I;', t);
    execute format(
      'create policy "own_rows" on public.%I for all to authenticated '
      || 'using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;

  -- profiles: o dono é a coluna id (= auth.uid()).
  execute 'alter table public.profiles enable row level security';
  execute 'drop policy if exists "own_rows" on public.profiles';
  execute 'create policy "own_rows" on public.profiles for all to authenticated '
       || 'using (auth.uid() = id) with check (auth.uid() = id)';
end $$;

-- Rode a Parte 1 de novo depois: todas as 15 tabelas devem ter rls_ativa = true
-- e qtd_policies >= 1.
notify pgrst, 'reload schema';
