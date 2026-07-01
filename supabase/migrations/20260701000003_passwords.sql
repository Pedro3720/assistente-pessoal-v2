-- ============================================================
-- Assistente Pessoal v2 — Migração 0004: Módulo Senhas (cofre)
-- A coluna "secret" guarda a senha CRIPTOGRAFADA (AES-256-GCM),
-- feita na aplicação. Nunca texto puro.
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.passwords (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  username   text,
  secret     text,   -- senha criptografada (iv:tag:ciphertext em base64)
  url        text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists passwords_user_idx on public.passwords (user_id);

drop trigger if exists passwords_set_updated_at on public.passwords;
create trigger passwords_set_updated_at before update on public.passwords
  for each row execute function public.set_updated_at();

alter table public.passwords enable row level security;
drop policy if exists "own_rows" on public.passwords;
create policy "own_rows" on public.passwords for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
