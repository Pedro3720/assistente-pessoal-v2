-- ============================================================
-- Assistente Pessoal v2 — Migração 0005: Conexão Google Calendar
-- Guarda os tokens OAuth do Google (CRIPTOGRAFADOS pela aplicação).
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.google_accounts (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  google_email  text,
  access_token  text not null,   -- criptografado (iv:tag:ciphertext)
  refresh_token text,            -- criptografado
  expiry        timestamptz,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists google_accounts_set_updated_at on public.google_accounts;
create trigger google_accounts_set_updated_at before update on public.google_accounts
  for each row execute function public.set_updated_at();

alter table public.google_accounts enable row level security;
drop policy if exists "own_rows" on public.google_accounts;
create policy "own_rows" on public.google_accounts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
