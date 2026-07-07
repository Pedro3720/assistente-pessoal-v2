-- Migração 0009: transferência entre contas
alter table public.transactions add column if not exists is_transfer boolean not null default false;
alter table public.transactions add column if not exists transfer_group uuid;
create index if not exists tx_transfer_group_idx on public.transactions (transfer_group);
notify pgrst, 'reload schema';
