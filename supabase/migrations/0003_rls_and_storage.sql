-- ARSIPERS 0003: Row Level Security dan storage privat.
-- Prinsip: tidak ada USING (true) untuk data privat; mutasi kritis hanya lewat RPC (0004).

do $$ declare t text; begin
  foreach t in array array['roles','permissions','role_permissions','profiles','school_settings','letter_categories',
    'incoming_letters','letter_templates','letter_template_versions','outgoing_letters','letter_versions','letter_approvals',
    'letter_deliveries','letter_attachments','letter_dispositions','disposition_responses','numbering_counters',
    'archive_records','notifications','audit_logs']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- Referensi (read-only untuk pengguna aktif)
create policy roles_read on public.roles for select to authenticated using (public.current_role_code() is not null);
create policy perms_read on public.permissions for select to authenticated using (public.current_role_code() is not null);
create policy roleperms_read on public.role_permissions for select to authenticated using (public.current_role_code() is not null);

-- Profil
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_role_code() is not null);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, nip, position) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;

-- Pengaturan
create policy settings_read on public.school_settings for select to authenticated using (public.current_role_code() is not null);
create policy settings_update on public.school_settings for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
revoke insert, delete on public.school_settings from authenticated;
revoke update on public.school_settings from authenticated;
grant update (name, npsn, address, phone, email, principal_name, principal_nip, letterhead_note,
              number_format, number_seq_pad, number_reset, timezone) on public.school_settings to authenticated;

create policy categories_read on public.letter_categories for select to authenticated using (public.current_role_code() is not null);
create policy categories_write on public.letter_categories for insert to authenticated with check (public.has_permission('settings.manage'));
create policy categories_update on public.letter_categories for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy templates_read on public.letter_templates for select to authenticated using (public.current_role_code() is not null);
create policy templates_insert on public.letter_templates for insert to authenticated with check (public.has_permission('settings.manage'));
create policy templates_update on public.letter_templates for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
create policy template_versions_read on public.letter_template_versions for select to authenticated using (public.current_role_code() is not null);

-- Surat masuk
create policy incoming_select on public.incoming_letters for select to authenticated
  using (deleted_at is null and public.can_view_incoming(id, is_confidential, created_by));
create policy incoming_insert on public.incoming_letters for insert to authenticated
  with check (public.has_permission('letters.incoming.create') and created_by = auth.uid() and status = 'DICATAT' and deleted_at is null);
create policy incoming_update on public.incoming_letters for update to authenticated
  using (deleted_at is null and public.has_permission('letters.incoming.update')
         and public.can_view_incoming(id, is_confidential, created_by)
         and status in ('DITERIMA','DICATAT','DIVERIFIKASI'))
  with check (public.has_permission('letters.incoming.update'));

-- Surat keluar
create policy outgoing_select on public.outgoing_letters for select to authenticated
  using (deleted_at is null and public.can_view_outgoing(is_confidential, created_by));
create policy outgoing_insert on public.outgoing_letters for insert to authenticated
  with check (public.has_permission('letters.outgoing.create') and created_by = auth.uid()
              and status = 'DRAFT' and number is null and version = 1 and deleted_at is null);
create policy outgoing_update on public.outgoing_letters for update to authenticated
  using (deleted_at is null and status in ('DRAFT','PERLU_REVISI')
         and (created_by = auth.uid() or public.has_permission('letters.outgoing.update'))
         and public.can_view_outgoing(is_confidential, created_by))
  with check (created_by is not null);

create policy lversions_select on public.letter_versions for select to authenticated
  using (exists (select 1 from public.outgoing_letters o where o.id = outgoing_letter_id));
create policy lapprovals_select on public.letter_approvals for select to authenticated
  using (exists (select 1 from public.outgoing_letters o where o.id = outgoing_letter_id));
create policy ldeliveries_select on public.letter_deliveries for select to authenticated
  using (exists (select 1 from public.outgoing_letters o where o.id = outgoing_letter_id));

-- Lampiran
create policy attachments_select on public.letter_attachments for select to authenticated
  using ((incoming_letter_id is not null and exists (select 1 from public.incoming_letters l where l.id = incoming_letter_id))
      or (outgoing_letter_id is not null and exists (select 1 from public.outgoing_letters o where o.id = outgoing_letter_id)));
create policy attachments_insert on public.letter_attachments for insert to authenticated
  with check (uploaded_by = auth.uid() and (
      (incoming_letter_id is not null and public.has_permission('letters.incoming.update')
         and exists (select 1 from public.incoming_letters l where l.id = incoming_letter_id and l.status in ('DITERIMA','DICATAT','DIVERIFIKASI')))
   or (outgoing_letter_id is not null
         and exists (select 1 from public.outgoing_letters o where o.id = outgoing_letter_id and o.status in ('DRAFT','PERLU_REVISI')
                     and (o.created_by = auth.uid() or public.has_permission('letters.outgoing.update'))))));

-- Disposisi
create policy disp_select on public.letter_dispositions for select to authenticated
  using (assigned_to = auth.uid() or exists (select 1 from public.incoming_letters l where l.id = incoming_letter_id));
create policy disp_resp_select on public.disposition_responses for select to authenticated
  using (exists (select 1 from public.letter_dispositions d where d.id = disposition_id));

-- Arsip
create policy archive_select on public.archive_records for select to authenticated
  using (public.has_permission('archives.view') and (
      (incoming_letter_id is not null and exists (select 1 from public.incoming_letters l where l.id = incoming_letter_id))
   or (outgoing_letter_id is not null and exists (select 1 from public.outgoing_letters o where o.id = outgoing_letter_id))));

-- Notifikasi (hanya milik sendiri; hanya kolom read_at yang boleh diubah)
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Audit: baca saja bila berizin; tidak ada policy insert/update/delete
create policy audit_select on public.audit_logs for select to authenticated using (public.has_permission('audit_logs.view'));
revoke insert, update, delete on public.audit_logs from authenticated, anon;

-- numbering_counters: tanpa policy = tidak dapat diakses klien
revoke all on public.numbering_counters from authenticated, anon;

-- Cabut hak tulis langsung pada tabel yang hanya dimutasi lewat RPC
revoke insert, update, delete on public.letter_versions, public.letter_approvals, public.letter_deliveries,
  public.letter_dispositions, public.disposition_responses, public.archive_records,
  public.roles, public.permissions, public.role_permissions from authenticated, anon;
revoke delete on public.incoming_letters, public.outgoing_letters, public.letter_attachments, public.letter_categories,
  public.letter_templates, public.letter_template_versions, public.notifications from authenticated, anon;
revoke all on all tables in schema public from anon;

-- ===== Storage: bucket privat =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('letter-files','letter-files', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false;

create policy letterfiles_select on storage.objects for select to authenticated
  using (bucket_id = 'letter-files' and exists (select 1 from public.letter_attachments a where a.storage_path = name));
create policy letterfiles_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'letter-files' and (
      public.has_permission('letters.incoming.update') or public.has_permission('letters.outgoing.create')
      or public.has_permission('letters.outgoing.update')) and owner = auth.uid());
-- Tidak ada policy update/delete: berkas tidak dapat ditimpa atau dihapus oleh klien.
