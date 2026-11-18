-- ARSIPERS 0004: operasi atomik (RPC). Semua SECURITY DEFINER, memeriksa izin di dalam fungsi.

create or replace function public._need_perm(p text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(p) then raise exception 'Akses ditolak: izin % diperlukan', p using errcode = '42501'; end if;
end $$;
revoke execute on function public._need_perm(text) from public, anon, authenticated;

-- ===== Pengguna =====
create or replace function public.admin_set_user(p_user uuid, p_full_name text, p_role text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare old_r text; old_a boolean;
begin
  perform public._need_perm('users.manage');
  select role_code, is_active into old_r, old_a from public.profiles where id = p_user;
  if not found then raise exception 'Pengguna tidak ditemukan'; end if;
  if p_user = auth.uid() and (old_r is distinct from p_role or old_a is distinct from p_active) then
    raise exception 'Anda tidak dapat mengubah role atau status akun Anda sendiri';
  end if;
  if not exists (select 1 from public.roles where code = p_role) then raise exception 'Role tidak valid'; end if;
  perform set_config('app.bypass_guard','on', true);
  update public.profiles set full_name = coalesce(nullif(trim(p_full_name),''), full_name), role_code = p_role, is_active = p_active where id = p_user;
  perform public.write_audit('USER_UPDATE','profile',p_user::text,
    jsonb_build_object('role_from',old_r,'role_to',p_role,'active_from',old_a,'active_to',p_active));
end $$;

-- ===== Surat masuk =====
create or replace function public.transition_incoming(p_id uuid, p_to text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare l public.incoming_letters; ok boolean;
begin
  perform public._need_perm('letters.incoming.update');
  select * into l from public.incoming_letters where id = p_id and deleted_at is null for update;
  if not found or not public.can_view_incoming(l.id, l.is_confidential, l.created_by) then raise exception 'Surat tidak ditemukan'; end if;
  ok := (l.status, p_to) in (
    ('DITERIMA','DICATAT'),('DICATAT','DIVERIFIKASI'),
    ('DIVERIFIKASI','MENUNGGU_DISPOSISI'),('DIVERIFIKASI','DITINDAKLANJUTI'),('DIVERIFIKASI','SELESAI'),
    ('MENUNGGU_DISPOSISI','DITINDAKLANJUTI'),('DITINDAKLANJUTI','SELESAI'));
  if not ok then raise exception 'Perubahan status % -> % tidak diizinkan', l.status, p_to; end if;
  perform set_config('app.bypass_guard','on', true);
  update public.incoming_letters set status = p_to where id = p_id;
  perform public.write_audit('INCOMING_STATUS','incoming_letter',p_id::text,
    jsonb_build_object('from',l.status,'to',p_to,'note',left(coalesce(p_note,''),500)));
end $$;

create or replace function public.delete_letter(p_kind text, p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare st text; creator uuid;
begin
  if length(trim(coalesce(p_reason,''))) < 5 then raise exception 'Alasan penghapusan wajib diisi (minimal 5 karakter)'; end if;
  perform set_config('app.bypass_guard','on', true);
  if p_kind = 'incoming' then
    perform public._need_perm('letters.incoming.delete');
    select status into st from public.incoming_letters where id = p_id and deleted_at is null for update;
    if st is null then raise exception 'Surat tidak ditemukan'; end if;
    if st not in ('DITERIMA','DICATAT') then raise exception 'Hanya surat berstatus Diterima/Dicatat yang dapat dihapus'; end if;
    update public.incoming_letters set deleted_at = now() where id = p_id;
  elsif p_kind = 'outgoing' then
    select status, created_by into st, creator from public.outgoing_letters where id = p_id and deleted_at is null for update;
    if st is null then raise exception 'Surat tidak ditemukan'; end if;
    if not (creator = auth.uid() or public.has_permission('letters.outgoing.update')) then raise exception 'Akses ditolak' using errcode='42501'; end if;
    if st <> 'DRAFT' then raise exception 'Hanya draft yang dapat dihapus'; end if;
    update public.outgoing_letters set deleted_at = now() where id = p_id;
  else raise exception 'Jenis surat tidak valid'; end if;
  perform public.write_audit('LETTER_DELETE', p_kind || '_letter', p_id::text, jsonb_build_object('reason', left(p_reason,500)));
end $$;

-- ===== Disposisi =====
create or replace function public.create_disposition(p_incoming uuid, p_assignees uuid[], p_instruction text, p_priority text, p_due date)
returns int language plpgsql security definer set search_path = public as $$
declare l public.incoming_letters; a uuid; n int := 0; did uuid;
begin
  perform public._need_perm('letters.disposition.create');
  if length(trim(coalesce(p_instruction,''))) < 3 then raise exception 'Instruksi wajib diisi'; end if;
  if p_assignees is null or array_length(p_assignees,1) is null then raise exception 'Pilih minimal satu penerima'; end if;
  select * into l from public.incoming_letters where id = p_incoming and deleted_at is null for update;
  if not found or not public.can_view_incoming(l.id, l.is_confidential, l.created_by) then raise exception 'Surat tidak ditemukan'; end if;
  if l.status not in ('DIVERIFIKASI','MENUNGGU_DISPOSISI','DITINDAKLANJUTI') then
    raise exception 'Surat harus berstatus Diverifikasi sebelum didisposisikan (status saat ini: %)', l.status; end if;
  foreach a in array p_assignees loop
    if not exists (select 1 from public.profiles where id = a and is_active) then raise exception 'Penerima tidak aktif atau tidak ditemukan'; end if;
    insert into public.letter_dispositions (incoming_letter_id, assigned_to, instruction, priority, due_date, created_by)
      values (p_incoming, a, trim(p_instruction), coalesce(p_priority,'NORMAL'), p_due, auth.uid()) returning id into did;
    perform public.notify(a, 'DISPOSITION_NEW', 'Disposisi baru untuk Anda', '/disposisi/' || did);
    n := n + 1;
  end loop;
  perform set_config('app.bypass_guard','on', true);
  if l.status = 'DIVERIFIKASI' then update public.incoming_letters set status = 'MENUNGGU_DISPOSISI' where id = p_incoming; end if;
  perform public.write_audit('DISPOSITION_CREATE','incoming_letter',p_incoming::text, jsonb_build_object('recipients', n, 'priority', p_priority));
  return n;
end $$;

create or replace function public.respond_disposition(p_id uuid, p_to text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare d public.letter_dispositions; ok boolean;
begin
  perform public._need_perm('letters.disposition.respond');
  select * into d from public.letter_dispositions where id = p_id for update;
  if not found or d.assigned_to <> auth.uid() then raise exception 'Disposisi tidak ditemukan'; end if;
  ok := (d.status, p_to) in (('MENUNGGU','DITERIMA'),('DITERIMA','DALAM_PROSES'),('DALAM_PROSES','SELESAI'),('DITERIMA','SELESAI'));
  if not ok then raise exception 'Perubahan status % -> % tidak diizinkan', d.status, p_to; end if;
  if p_to = 'SELESAI' and length(trim(coalesce(p_note,''))) < 3 then raise exception 'Catatan hasil wajib diisi saat menyelesaikan disposisi'; end if;
  perform set_config('app.bypass_guard','on', true);
  update public.letter_dispositions set status = p_to, completed_note = case when p_to='SELESAI' then trim(p_note) else completed_note end where id = p_id;
  insert into public.disposition_responses (disposition_id, author_id, note, status_after) values (p_id, auth.uid(), nullif(trim(coalesce(p_note,'')),''), p_to);
  update public.incoming_letters set status = 'DITINDAKLANJUTI' where id = d.incoming_letter_id and status = 'MENUNGGU_DISPOSISI';
  perform public.notify(d.created_by, 'DISPOSITION_UPDATE',
    case when p_to='SELESAI' then 'Tindak lanjut disposisi selesai' else 'Status disposisi diperbarui' end, '/disposisi/' || p_id);
  perform public.write_audit('DISPOSITION_STATUS','disposition',p_id::text, jsonb_build_object('from',d.status,'to',p_to));
end $$;

-- ===== Penomoran (atomik) =====
create or replace function public._allocate_number(p_date date, p_code text)
returns table(num text, seq int) language plpgsql security definer set search_path = public as $$
declare s public.school_settings; per text; v int; res text;
  roman text[] := array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
begin
  select * into s from public.school_settings where id = 1;
  if s.number_format is null or position('{SEQ}' in s.number_format) = 0 then
    raise exception 'Format nomor surat belum dikonfirmasi/dikonfigurasi. Isi di Pengaturan > Penomoran surat (wajib memuat {SEQ}).';
  end if;
  per := case s.number_reset when 'YEARLY' then to_char(p_date,'YYYY') when 'MONTHLY' then to_char(p_date,'YYYY-MM') else 'ALL' end;
  -- upsert = kunci baris per (scope, period): dua penerbit bersamaan diserialkan oleh database
  insert into public.numbering_counters (scope, period, last_value) values ('OUTGOING', per, 1)
    on conflict (scope, period) do update set last_value = public.numbering_counters.last_value + 1
    returning last_value into v;
  res := s.number_format;
  res := replace(res, '{SEQ}', lpad(v::text, s.number_seq_pad, '0'));
  res := replace(res, '{YEAR}', to_char(p_date,'YYYY'));
  res := replace(res, '{MONTH}', to_char(p_date,'MM'));
  res := replace(res, '{MONTH_ROMAN}', roman[extract(month from p_date)::int]);
  res := replace(res, '{CODE}', coalesce(nullif(p_code,''),'UMUM'));
  return query select res, v;
end $$;
revoke execute on function public._allocate_number(date,text) from public, anon, authenticated;

-- ===== Surat keluar: workflow =====
create or replace function public._snapshot(o public.outgoing_letters) returns jsonb language sql immutable as $$
  select jsonb_build_object('number',o.number,'recipient',o.recipient,'subject',o.subject,'body',o.body,
    'letter_date',o.letter_date,'letter_type',o.letter_type,'nature',o.nature,'attachment_note',o.attachment_note,'version',o.version)
$$;

create or replace function public.transition_outgoing(p_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.outgoing_letters; to_s text; a text := upper(p_action); creator_name text;
begin
  select * into o from public.outgoing_letters where id = p_id and deleted_at is null for update;
  if not found or not public.can_view_outgoing(o.is_confidential, o.created_by) then raise exception 'Surat tidak ditemukan'; end if;

  if a = 'SUBMIT' then
    perform public._need_perm('letters.outgoing.submit');
    if o.status not in ('DRAFT','PERLU_REVISI') then raise exception 'Surat tidak dapat diajukan dari status %', o.status; end if;
    if length(trim(o.body)) < 10 then raise exception 'Isi surat belum diisi'; end if;
    to_s := 'DIAJUKAN';
  elsif a = 'REVIEW' then
    perform public._need_perm('letters.outgoing.approve');
    if o.status <> 'DIAJUKAN' then raise exception 'Surat belum diajukan'; end if;
    to_s := 'DITINJAU';
  elsif a = 'REQUEST_REVISION' then
    perform public._need_perm('letters.outgoing.approve');
    if o.status not in ('DIAJUKAN','DITINJAU') then raise exception 'Revisi hanya dapat diminta saat diajukan/ditinjau'; end if;
    if length(trim(coalesce(p_note,''))) < 3 then raise exception 'Alasan revisi wajib diisi'; end if;
    to_s := 'PERLU_REVISI';
  elsif a = 'APPROVE' then
    perform public._need_perm('letters.outgoing.approve');
    if o.status <> 'DITINJAU' then raise exception 'Surat harus ditinjau sebelum disetujui'; end if;
    if o.created_by = auth.uid() and public.current_role_code() <> 'SUPER_ADMIN' then
      raise exception 'Pembuat surat tidak dapat menyetujui suratnya sendiri'; end if;
    to_s := 'DISETUJUI';
  else raise exception 'Aksi tidak dikenal'; end if;

  perform set_config('app.bypass_guard','on', true);
  update public.outgoing_letters set status = to_s,
    reviewed_by = case when a = 'REVIEW' then auth.uid() else reviewed_by end,
    approved_by = case when a = 'APPROVE' then auth.uid() else approved_by end,
    approved_at = case when a = 'APPROVE' then now() else approved_at end
  where id = p_id;
  insert into public.letter_approvals (outgoing_letter_id, action, actor_id, note, from_status, to_status)
    values (p_id, a, auth.uid(), nullif(trim(coalesce(p_note,'')),''), o.status, to_s);
  perform public.write_audit('OUTGOING_' || a, 'outgoing_letter', p_id::text, jsonb_build_object('from',o.status,'to',to_s));

  if a = 'SUBMIT' then
    insert into public.notifications (user_id, type, title, link)
      select pr.id, 'APPROVAL_REQUEST', 'Surat keluar menunggu pemeriksaan', '/surat-keluar/' || p_id
      from public.profiles pr join public.role_permissions rp on rp.role_code = pr.role_code
      where pr.is_active and rp.permission_code = 'letters.outgoing.approve' and pr.id <> auth.uid();
  elsif a in ('REQUEST_REVISION','APPROVE') then
    perform public.notify(o.created_by, case when a='APPROVE' then 'LETTER_APPROVED' else 'LETTER_REVISION' end,
      case when a='APPROVE' then 'Surat keluar disetujui' else 'Surat keluar perlu revisi' end, '/surat-keluar/' || p_id);
  end if;
end $$;

create or replace function public.finalize_outgoing_letter(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare o public.outgoing_letters; code text; r record; ver int;
begin
  perform public._need_perm('letters.outgoing.update');
  select * into o from public.outgoing_letters where id = p_id and deleted_at is null for update;
  if not found or not public.can_view_outgoing(o.is_confidential, o.created_by) then raise exception 'Surat tidak ditemukan'; end if;
  if o.status <> 'DISETUJUI' then raise exception 'Hanya surat berstatus Disetujui yang dapat difinalkan'; end if;
  perform set_config('app.bypass_guard','on', true);
  if o.number is null then
    select c.code into code from public.letter_categories c where c.id = o.category_id;
    select * into r from public._allocate_number(o.letter_date, code);
    update public.outgoing_letters set number = r.num, number_seq = r.seq, number_allocated_by = auth.uid(), number_allocated_at = now() where id = p_id;
    perform public.write_audit('NUMBER_ALLOCATE','outgoing_letter',p_id::text, jsonb_build_object('number', r.num));
  end if;
  update public.outgoing_letters set status = 'FINAL' where id = p_id returning * into o;
  insert into public.letter_versions (outgoing_letter_id, version, snapshot, created_by)
    values (p_id, o.version, public._snapshot(o), auth.uid());
  insert into public.letter_approvals (outgoing_letter_id, action, actor_id, from_status, to_status)
    values (p_id, 'FINALIZE', auth.uid(), 'DISETUJUI', 'FINAL');
  perform public.write_audit('OUTGOING_FINALIZE','outgoing_letter',p_id::text, jsonb_build_object('number', o.number, 'version', o.version));
  return o.number;
end $$;

create or replace function public.revise_outgoing_letter(p_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.outgoing_letters;
begin
  perform public._need_perm('letters.outgoing.update');
  if length(trim(coalesce(p_note,''))) < 3 then raise exception 'Alasan revisi wajib diisi'; end if;
  select * into o from public.outgoing_letters where id = p_id and deleted_at is null for update;
  if not found or not public.can_view_outgoing(o.is_confidential, o.created_by) then raise exception 'Surat tidak ditemukan'; end if;
  if o.status not in ('DISETUJUI','FINAL') then raise exception 'Surat yang sudah dikirim/diarsipkan tidak dapat direvisi; buat surat baru'; end if;
  perform set_config('app.bypass_guard','on', true);
  update public.outgoing_letters set status = 'PERLU_REVISI', version = version + 1, approved_by = null, approved_at = null where id = p_id;
  insert into public.letter_approvals (outgoing_letter_id, action, actor_id, note, from_status, to_status)
    values (p_id, 'REOPEN', auth.uid(), trim(p_note), o.status, 'PERLU_REVISI');
  perform public.write_audit('OUTGOING_NEW_VERSION','outgoing_letter',p_id::text, jsonb_build_object('new_version', o.version + 1));
end $$;

create or replace function public.record_delivery(p_id uuid, p_method text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.outgoing_letters;
begin
  perform public._need_perm('letters.outgoing.update');
  if length(trim(coalesce(p_method,''))) < 2 then raise exception 'Metode pengiriman wajib diisi'; end if;
  select * into o from public.outgoing_letters where id = p_id and deleted_at is null for update;
  if not found or not public.can_view_outgoing(o.is_confidential, o.created_by) then raise exception 'Surat tidak ditemukan'; end if;
  if o.status <> 'FINAL' then raise exception 'Hanya surat Final yang dapat dicatat pengirimannya'; end if;
  perform set_config('app.bypass_guard','on', true);
  update public.outgoing_letters set status = 'DIKIRIM' where id = p_id;
  insert into public.letter_deliveries (outgoing_letter_id, method, note, recorded_by) values (p_id, trim(p_method), nullif(trim(coalesce(p_note,'')),''), auth.uid());
  insert into public.letter_approvals (outgoing_letter_id, action, actor_id, from_status, to_status) values (p_id, 'SEND', auth.uid(), 'FINAL', 'DIKIRIM');
  perform public.write_audit('OUTGOING_SEND','outgoing_letter',p_id::text, jsonb_build_object('method', p_method));
end $$;

-- ===== Pengarsipan =====
create or replace function public.archive_letter(p_kind text, p_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare st text; conf boolean; creator uuid;
begin
  perform public._need_perm('archives.manage');
  perform set_config('app.bypass_guard','on', true);
  if p_kind = 'incoming' then
    select status, is_confidential, created_by into st, conf, creator from public.incoming_letters where id = p_id and deleted_at is null for update;
    if st is null or not public.can_view_incoming(p_id, conf, creator) then raise exception 'Surat tidak ditemukan'; end if;
    if st <> 'SELESAI' then raise exception 'Hanya surat berstatus Selesai yang dapat diarsipkan'; end if;
    update public.incoming_letters set status = 'DIARSIPKAN' where id = p_id;
    insert into public.archive_records (incoming_letter_id, archived_by, retention_note) values (p_id, auth.uid(), nullif(trim(coalesce(p_note,'')),''));
  elsif p_kind = 'outgoing' then
    select status, is_confidential, created_by into st, conf, creator from public.outgoing_letters where id = p_id and deleted_at is null for update;
    if st is null or not public.can_view_outgoing(conf, creator) then raise exception 'Surat tidak ditemukan'; end if;
    if st <> 'DIKIRIM' then raise exception 'Hanya surat berstatus Dikirim yang dapat diarsipkan'; end if;
    update public.outgoing_letters set status = 'DIARSIPKAN' where id = p_id;
    insert into public.archive_records (outgoing_letter_id, archived_by, retention_note) values (p_id, auth.uid(), nullif(trim(coalesce(p_note,'')),''));
    insert into public.letter_approvals (outgoing_letter_id, action, actor_id, from_status, to_status) values (p_id, 'ARCHIVE', auth.uid(), 'DIKIRIM', 'DIARSIPKAN');
  else raise exception 'Jenis surat tidak valid'; end if;
  perform public.write_audit('ARCHIVE', p_kind || '_letter', p_id::text, '{}'::jsonb);
end $$;

-- Hak eksekusi: hanya pengguna login
do $$ declare f text; begin
  foreach f in array array[
    'admin_set_user(uuid,text,text,boolean)','transition_incoming(uuid,text,text)','delete_letter(text,uuid,text)',
    'create_disposition(uuid,uuid[],text,text,date)','respond_disposition(uuid,text,text)','transition_outgoing(uuid,text,text)',
    'finalize_outgoing_letter(uuid)','revise_outgoing_letter(uuid,text)','record_delivery(uuid,text,text)','archive_letter(text,uuid,text)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ===== Audit unduhan berkas (hanya jika lampiran terlihat oleh pengguna) =====
create or replace function public.log_file_download(p_attachment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.letter_attachments; vis boolean := false; il public.incoming_letters; ol public.outgoing_letters;
begin
  select * into a from public.letter_attachments where id = p_attachment;
  if not found then raise exception 'Berkas tidak ditemukan'; end if;
  if a.incoming_letter_id is not null then
    select * into il from public.incoming_letters where id = a.incoming_letter_id and deleted_at is null;
    vis := found and public.can_view_incoming(il.id, il.is_confidential, il.created_by);
  else
    select * into ol from public.outgoing_letters where id = a.outgoing_letter_id and deleted_at is null;
    vis := found and public.can_view_outgoing(ol.is_confidential, ol.created_by);
  end if;
  if not vis then raise exception 'Berkas tidak ditemukan'; end if;
  perform public.write_audit('FILE_DOWNLOAD','attachment',p_attachment::text,'{}'::jsonb);
end $$;
revoke execute on function public.log_file_download(uuid) from public, anon;
grant execute on function public.log_file_download(uuid) to authenticated;
