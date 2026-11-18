-- ARSIPERS 0002: seed role/permission (rekomendasi awal, perlu dikonfirmasi sekolah), fungsi bantu, trigger.

insert into public.roles (code, name, description) values
 ('SUPER_ADMIN','Super Admin','Pengelola sistem'),
 ('KEPALA_SEKOLAH','Kepala Sekolah','Pemantauan, disposisi, persetujuan surat keluar'),
 ('OPERATOR_TU','Operator TU','Pencatatan dan pemrosesan surat'),
 ('GURU','Guru','Menerima dan menindaklanjuti disposisi'),
 ('KOORDINATOR','Koordinator','Menerima dan menindaklanjuti disposisi'),
 ('ARSIPARIS','Arsiparis','Pengelolaan arsip');

insert into public.permissions (code, description) values
 ('letters.incoming.view','Melihat surat masuk'),
 ('letters.incoming.create','Mencatat surat masuk'),
 ('letters.incoming.update','Mengubah dan memproses surat masuk'),
 ('letters.incoming.delete','Menghapus (soft delete) surat masuk'),
 ('letters.outgoing.view','Melihat surat keluar'),
 ('letters.outgoing.create','Membuat draft surat keluar'),
 ('letters.outgoing.update','Mengubah, memfinalkan, dan mencatat pengiriman surat keluar'),
 ('letters.outgoing.submit','Mengajukan surat keluar'),
 ('letters.outgoing.approve','Meninjau dan menyetujui surat keluar'),
 ('letters.disposition.create','Membuat disposisi'),
 ('letters.disposition.respond','Menanggapi disposisi'),
 ('archives.view','Melihat arsip'),
 ('archives.manage','Mengarsipkan surat'),
 ('reports.view','Melihat laporan'),
 ('users.manage','Mengelola pengguna dan role'),
 ('settings.manage','Mengelola pengaturan sekolah, kategori, template'),
 ('audit_logs.view','Melihat audit log');

insert into public.role_permissions (role_code, permission_code)
  select 'SUPER_ADMIN', code from public.permissions;
insert into public.role_permissions (role_code, permission_code) values
 ('KEPALA_SEKOLAH','letters.incoming.view'),('KEPALA_SEKOLAH','letters.outgoing.view'),
 ('KEPALA_SEKOLAH','letters.outgoing.approve'),('KEPALA_SEKOLAH','letters.disposition.create'),
 ('KEPALA_SEKOLAH','archives.view'),('KEPALA_SEKOLAH','reports.view'),('KEPALA_SEKOLAH','audit_logs.view'),
 ('OPERATOR_TU','letters.incoming.view'),('OPERATOR_TU','letters.incoming.create'),('OPERATOR_TU','letters.incoming.update'),
 ('OPERATOR_TU','letters.outgoing.view'),('OPERATOR_TU','letters.outgoing.create'),('OPERATOR_TU','letters.outgoing.update'),
 ('OPERATOR_TU','letters.outgoing.submit'),('OPERATOR_TU','archives.view'),('OPERATOR_TU','archives.manage'),('OPERATOR_TU','reports.view'),
 ('GURU','letters.disposition.respond'),
 ('KOORDINATOR','letters.disposition.respond'),
 ('ARSIPARIS','letters.incoming.view'),('ARSIPARIS','letters.outgoing.view'),('ARSIPARIS','archives.view'),
 ('ARSIPARIS','archives.manage'),('ARSIPARIS','reports.view');

-- ===== Fungsi bantu =====
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.current_role_code() returns text
language sql stable security definer set search_path = public as $$
  select role_code from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.has_permission(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles pr
    join public.role_permissions rp on rp.role_code = pr.role_code
    where pr.id = auth.uid() and pr.is_active and rp.permission_code = p)
$$;

-- Peran yang boleh melihat surat rahasia milik orang lain (rekomendasi; perlu konfirmasi sekolah)
create or replace function public.can_see_confidential() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_code() in ('SUPER_ADMIN','KEPALA_SEKOLAH'), false)
$$;

create or replace function public.can_view_incoming(p_id uuid, p_conf boolean, p_creator uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.profiles where id = auth.uid() and is_active) and (
    (public.has_permission('letters.incoming.view')
       and (not p_conf or public.can_see_confidential() or p_creator = auth.uid()))
    or exists (select 1 from public.letter_dispositions d where d.incoming_letter_id = p_id and d.assigned_to = auth.uid())
  )
$$;

create or replace function public.can_view_outgoing(p_conf boolean, p_creator uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.profiles where id = auth.uid() and is_active) and (
    p_creator = auth.uid()
    or (public.has_permission('letters.outgoing.view') and (not p_conf or public.can_see_confidential()))
  )
$$;

-- Audit hanya dapat ditulis oleh fungsi SECURITY DEFINER (tidak dapat dipanggil klien)
create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata, request_id)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_meta,'{}'::jsonb),
          nullif(current_setting('request.headers', true)::jsonb ->> 'x-request-id', ''));
exception when others then
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_meta,'{}'::jsonb));
end $$;
revoke execute on function public.write_audit(text,text,text,jsonb) from public, anon, authenticated;

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, link) values (p_user, p_type, p_title, p_link)
$$;
revoke execute on function public.notify(uuid,text,text,text) from public, anon, authenticated;

-- Hanya peristiwa login/logout yang boleh dicatat langsung oleh klien
create or replace function public.log_auth_event(p_action text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_action not in ('AUTH_LOGIN','AUTH_LOGOUT') then raise exception 'Aksi tidak diizinkan'; end if;
  perform public.write_audit(p_action, 'session', auth.uid()::text, '{}'::jsonb);
end $$;
grant execute on function public.log_auth_event(text) to authenticated;

-- ===== Profil otomatis saat akun dibuat (role awal terendah; JANGAN percaya user_metadata) =====
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role_code)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''), 'GURU')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== updated_at =====
create trigger trg_profiles_upd before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_incoming_upd before update on public.incoming_letters for each row execute function public.set_updated_at();
create trigger trg_outgoing_upd before update on public.outgoing_letters for each row execute function public.set_updated_at();
create trigger trg_disp_upd before update on public.letter_dispositions for each row execute function public.set_updated_at();
create trigger trg_templates_upd before update on public.letter_templates for each row execute function public.set_updated_at();
create trigger trg_settings_upd before update on public.school_settings for each row execute function public.set_updated_at();

-- ===== Penjaga kolom: status/nomor/persetujuan hanya boleh berubah lewat RPC =====
create or replace function public.guard_incoming() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.bypass_guard', true),'') <> 'on' then
    if new.status is distinct from old.status
       or new.created_by is distinct from old.created_by
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Kolom status/pembuat/penghapusan hanya dapat diubah melalui proses resmi';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_incoming before update on public.incoming_letters for each row execute function public.guard_incoming();

create or replace function public.guard_outgoing() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.bypass_guard', true),'') <> 'on' then
    if new.status is distinct from old.status or new.number is distinct from old.number
       or new.number_seq is distinct from old.number_seq or new.version is distinct from old.version
       or new.created_by is distinct from old.created_by or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at or new.reviewed_by is distinct from old.reviewed_by
       or new.number_allocated_by is distinct from old.number_allocated_by
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Kolom status/nomor/persetujuan hanya dapat diubah melalui proses resmi';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_outgoing before update on public.outgoing_letters for each row execute function public.guard_outgoing();

-- ===== Versi template =====
create or replace function public.template_versioning() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.letter_template_versions (template_id, version, body, created_by) values (new.id, new.version, new.body, auth.uid());
  elsif new.body is distinct from old.body then
    new.version := old.version + 1;
    insert into public.letter_template_versions (template_id, version, body, created_by) values (new.id, new.version, new.body, auth.uid());
  end if;
  return new;
end $$;
create trigger trg_template_ver_ins after insert on public.letter_templates for each row execute function public.template_versioning();
create trigger trg_template_ver_upd before update on public.letter_templates for each row execute function public.template_versioning();

-- ===== Audit otomatis perubahan langsung (tanpa isi surat) =====
create or replace function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare cols text[]; k text; ent text := tg_argv[0]; eid text;
begin
  if coalesce(current_setting('app.bypass_guard', true),'') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    eid := to_jsonb(new) ->> coalesce(tg_argv[1],'id');
    perform public.write_audit(upper(ent) || '_CREATE', ent, eid, '{}'::jsonb);
  else
    eid := to_jsonb(new) ->> coalesce(tg_argv[1],'id');
    for k in select key from jsonb_each(to_jsonb(new)) loop
      if (to_jsonb(new) -> k) is distinct from (to_jsonb(old) -> k) and k <> 'updated_at' then cols := array_append(cols, k); end if;
    end loop;
    if cols is not null then
      perform public.write_audit(upper(ent) || '_UPDATE', ent, eid, jsonb_build_object('changed_columns', cols));
    end if;
  end if;
  return new;
end $$;
create trigger aud_incoming after insert or update on public.incoming_letters for each row execute function public.audit_row('incoming_letter');
create trigger aud_outgoing after insert or update on public.outgoing_letters for each row execute function public.audit_row('outgoing_letter');
create trigger aud_settings after update on public.school_settings for each row execute function public.audit_row('school_settings');
create trigger aud_templates after insert or update on public.letter_templates for each row execute function public.audit_row('letter_template');
create trigger aud_categories after insert or update on public.letter_categories for each row execute function public.audit_row('letter_category');
create trigger aud_attachments after insert on public.letter_attachments for each row execute function public.audit_row('attachment');
