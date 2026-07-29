-- =====================================================================
-- Secure Supabase Storage buckets. All private; access via RLS on
-- storage.objects. Public forms upload to intake buckets only.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('documents',        'documents',        false),
  ('receipts',         'receipts',         false),
  ('vendor-files',     'vendor-files',     false),
  ('sponsor-proposals','sponsor-proposals',false),
  ('team-crests',      'team-crests',      false),
  ('player-waivers',   'player-waivers',   false),
  ('media-assets',     'media-assets',     false)
on conflict (id) do nothing;

-- Staff can read/write every internal bucket ---------------------------
do $$
declare b text;
  buckets text[] := array['documents','receipts','vendor-files','sponsor-proposals','team-crests','player-waivers','media-assets'];
begin
  for b in select unnest(buckets) loop
    execute format($p$
      create policy %1$I on storage.objects for select to authenticated
      using (bucket_id = %2$L and public.is_staff())$p$,
      'read_' || replace(b,'-','_'), b);
    execute format($p$
      create policy %1$I on storage.objects for insert to authenticated
      with check (bucket_id = %2$L and public.can_edit())$p$,
      'write_' || replace(b,'-','_'), b);
    execute format($p$
      create policy %1$I on storage.objects for update to authenticated
      using (bucket_id = %2$L and public.can_edit())$p$,
      'update_' || replace(b,'-','_'), b);
    execute format($p$
      create policy %1$I on storage.objects for delete to authenticated
      using (bucket_id = %2$L and public.can_delete())$p$,
      'delete_' || replace(b,'-','_'), b);
  end loop;
end $$;

-- Public intake uploads: anon may write (not read) team crests, vendor
-- files and player waivers submitted through public forms.
create policy public_upload_crests on storage.objects for insert to anon
  with check (bucket_id = 'team-crests');
create policy public_upload_vendor on storage.objects for insert to anon
  with check (bucket_id = 'vendor-files');
create policy public_upload_waivers on storage.objects for insert to anon
  with check (bucket_id = 'player-waivers');
