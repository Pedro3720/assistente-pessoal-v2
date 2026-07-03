-- Migração 0008: sugestões de melhorias + bucket de prints
create table if not exists public.suggestions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  image_url   text,
  status      text not null default 'aberto' check (status in ('aberto','feito')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists suggestions_user_idx on public.suggestions (user_id);

drop trigger if exists suggestions_set_updated_at on public.suggestions;
create trigger suggestions_set_updated_at before update on public.suggestions
  for each row execute function public.set_updated_at();

alter table public.suggestions enable row level security;
drop policy if exists "own_rows" on public.suggestions;
create policy "own_rows" on public.suggestions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('suggestions','suggestions', true)
  on conflict (id) do nothing;
drop policy if exists "sugg_public_read" on storage.objects;
create policy "sugg_public_read" on storage.objects for select using (bucket_id = 'suggestions');
drop policy if exists "sugg_own_write" on storage.objects;
create policy "sugg_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'suggestions' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
