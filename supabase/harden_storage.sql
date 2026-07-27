-- ============================================================
-- Assistente Pessoal v2 — Endurecimento do Storage (Nível 3 de segurança)
-- Cole e rode no Supabase -> SQL Editor.
--
-- O que faz:
--  1) Limita TIPO e TAMANHO de arquivo no proprio Storage (defesa a mais,
--     alem da checagem no app em src/lib/storage/upload.ts).
--  2) Reafirma as policies own_* (escrita/atualizacao/exclusao so na pasta
--     {user_id}/ de cada bucket). Idempotente; nao enfraquece nada.
--
-- Observacao: os buckets 'avatars' e 'suggestions' continuam PUBLICOS para
-- leitura (a app serve por URL publica). Se um dia quiser deixar privado e
-- servir por signed URL, veja o bloco COMENTADO no fim (exige tambem mudar o
-- codigo que exibe as imagens).
-- ============================================================

-- ─── 1) Limites por bucket (tipo + tamanho) ───────────────
update storage.buckets
set file_size_limit    = 5242880,  -- 5 MB por arquivo
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id in ('avatars','suggestions');

-- ─── 2) Policies own_* por bucket (pasta {user_id}/) ──────
-- avatars
drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
drop policy if exists "avatar_own_write" on storage.objects;
create policy "avatar_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar_own_update" on storage.objects;
create policy "avatar_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar_own_delete" on storage.objects;
create policy "avatar_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- suggestions
drop policy if exists "sugg_public_read" on storage.objects;
create policy "sugg_public_read" on storage.objects for select
  using (bucket_id = 'suggestions');
drop policy if exists "sugg_own_write" on storage.objects;
create policy "sugg_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'suggestions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sugg_own_update" on storage.objects;
create policy "sugg_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'suggestions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sugg_own_delete" on storage.objects;
create policy "sugg_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'suggestions' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─── (Opcional) Deixar privado + signed URL ───────────────
-- NAO rode isto sem antes trocar o codigo que exibe as imagens para gerar
-- signed URLs (createSignedUrl) e migrar as URLs ja salvas no banco. Se rodar
-- so o SQL, as imagens existentes param de aparecer.
--   update storage.buckets set public = false where id in ('avatars','suggestions');
--   drop policy if exists "avatar_public_read" on storage.objects;
--   drop policy if exists "sugg_public_read"   on storage.objects;
--   -- e criar policies de select restritas ao dono, se for o caso.

notify pgrst, 'reload schema';
