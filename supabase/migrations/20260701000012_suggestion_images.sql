-- Migração 0012: múltiplas imagens por sugestão
-- Mantém image_url (1ª imagem, compat) e adiciona image_urls (todas).
alter table public.suggestions
  add column if not exists image_urls text[] not null default '{}';
notify pgrst, 'reload schema';
