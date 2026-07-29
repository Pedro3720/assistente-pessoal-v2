-- ============================================================
-- Migração 0017: índices de dedupe utilizáveis pelo upsert
-- Cole e rode no Supabase → SQL Editor.
--
-- Por que existe: os índices criados nas migrações 0015/0016 eram PARCIAIS
-- (com "where ... is not null"). O Postgres só usa um índice parcial no
-- ON CONFLICT se conseguir inferir o predicado, o que não acontece pela API,
-- e o upsert falhava com:
--   42P10 "there is no unique or exclusion constraint matching the
--          ON CONFLICT specification"
--
-- A troca por índice único TOTAL preserva a mesma garantia: no Postgres dois
-- NULL não são considerados iguais, então continuam permitidas várias contas
-- manuais (pluggy_account_id nulo) e várias transações digitadas
-- (external_id nulo). O que fica impedido é justamente o que interessa:
-- a mesma conta ou a mesma transação da Pluggy entrar duas vezes.
--
-- Idempotente e sem perda de dados.
-- ============================================================

-- ─── CONTAS ─────────────────────────────────────────────────
drop index if exists public.banks_user_pluggy_account_uidx;
create unique index if not exists banks_user_pluggy_account_uidx
  on public.banks (user_id, pluggy_account_id);

-- ─── TRANSAÇÕES (dedupe do sync) ────────────────────────────
drop index if exists public.transactions_user_external_uidx;
create unique index if not exists transactions_user_external_uidx
  on public.transactions (user_id, external_id);

-- ─── CONEXÕES ───────────────────────────────────────────────
-- o upsert de pluggy_items usa (user_id, item_id); garante que exista
create unique index if not exists pluggy_items_user_item_uidx
  on public.pluggy_items (user_id, item_id);

notify pgrst, 'reload schema';
