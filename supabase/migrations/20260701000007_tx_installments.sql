-- Migração 0007: parcelamento de compras no cartão
alter table public.transactions add column if not exists purchase_group uuid;
alter table public.transactions add column if not exists installments  int not null default 1;
alter table public.transactions add column if not exists installment_no int not null default 1;
create index if not exists tx_purchase_group_idx on public.transactions (purchase_group);
notify pgrst, 'reload schema';
