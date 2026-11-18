-- ARSIPERS 0001: skema inti. Jalankan berurutan 0001 -> 0004.
create extension if not exists pgcrypto;

-- ===== RBAC =====
create table public.roles (
  code text primary key,
  name text not null,
  description text
);
create table public.permissions (
  code text primary key,
  description text not null
);
create table public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  nip text,
  position text,
  role_code text not null default 'GURU' references public.roles(code),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== Pengaturan sekolah (satu baris; semua identitas dibiarkan kosong) =====
create table public.school_settings (
  id smallint primary key default 1 check (id = 1),
  name text,
  npsn text,
  address text,
  phone text,
  email text,
  principal_name text,
  principal_nip text,
  logo_path text,
  letterhead_note text,
  number_format text,           -- mis. token {SEQ} {YEAR} {MONTH} {MONTH_ROMAN} {CODE}; NULL = belum dikonfirmasi
  number_seq_pad smallint not null default 3 check (number_seq_pad between 1 and 8),
  number_reset text not null default 'YEARLY' check (number_reset in ('YEARLY','MONTHLY','NEVER')),
  timezone text not null default 'Asia/Jakarta',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
insert into public.school_settings (id) values (1);

create table public.letter_categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('incoming','outgoing')),
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, code)
);

-- ===== Surat masuk =====
create table public.incoming_letters (
  id uuid primary key default gen_random_uuid(),
  external_number text,
  letter_date date not null,
  received_date date not null,
  sender text not null,
  origin_org text,
  subject text not null,
  category_id uuid references public.letter_categories(id),
  classification text,
  nature text not null default 'BIASA' check (nature in ('BIASA','PENTING','SEGERA','RAHASIA')),
  is_confidential boolean not null default false,
  summary text,
  needs_disposition boolean not null default false,
  status text not null default 'DICATAT' check (status in
    ('DITERIMA','DICATAT','DIVERIFIKASI','MENUNGGU_DISPOSISI','DITINDAKLANJUTI','SELESAI','DIARSIPKAN')),
  received_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (received_date >= letter_date)
);
create index on public.incoming_letters (status) where deleted_at is null;
create index on public.incoming_letters (received_date desc);
create index on public.incoming_letters (created_by);

-- ===== Template =====
create table public.letter_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  letter_type text not null,
  body text not null,
  version int not null default 1,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.letter_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.letter_templates(id) on delete cascade,
  version int not null,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

-- ===== Surat keluar =====
create table public.outgoing_letters (
  id uuid primary key default gen_random_uuid(),
  number text,
  number_seq int,
  letter_type text not null default 'UMUM',
  category_id uuid references public.letter_categories(id),
  template_id uuid references public.letter_templates(id),
  recipient text not null,
  subject text not null,
  body text not null default '',
  letter_date date not null,
  attachment_note text,
  nature text not null default 'BIASA' check (nature in ('BIASA','PENTING','SEGERA','RAHASIA')),
  is_confidential boolean not null default false,
  status text not null default 'DRAFT' check (status in
    ('DRAFT','DIAJUKAN','DITINJAU','PERLU_REVISI','DISETUJUI','FINAL','DIKIRIM','DIARSIPKAN')),
  version int not null default 1,
  created_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  number_allocated_by uuid references public.profiles(id),
  number_allocated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index outgoing_number_unique on public.outgoing_letters (number) where number is not null;
create index on public.outgoing_letters (status) where deleted_at is null;
create index on public.outgoing_letters (created_by);

create table public.letter_versions (
  id uuid primary key default gen_random_uuid(),
  outgoing_letter_id uuid not null references public.outgoing_letters(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (outgoing_letter_id, version)
);

create table public.letter_approvals (
  id uuid primary key default gen_random_uuid(),
  outgoing_letter_id uuid not null references public.outgoing_letters(id) on delete cascade,
  action text not null check (action in ('SUBMIT','REVIEW','REQUEST_REVISION','APPROVE','FINALIZE','SEND','ARCHIVE','REOPEN')),
  actor_id uuid not null references public.profiles(id),
  note text,
  from_status text,
  to_status text,
  created_at timestamptz not null default now()
);
create index on public.letter_approvals (outgoing_letter_id, created_at);

create table public.letter_deliveries (
  id uuid primary key default gen_random_uuid(),
  outgoing_letter_id uuid not null references public.outgoing_letters(id) on delete cascade,
  method text not null,
  note text,
  delivered_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles(id)
);

-- ===== Lampiran =====
create table public.letter_attachments (
  id uuid primary key default gen_random_uuid(),
  incoming_letter_id uuid references public.incoming_letters(id) on delete cascade,
  outgoing_letter_id uuid references public.outgoing_letters(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((incoming_letter_id is not null)::int + (outgoing_letter_id is not null)::int = 1)
);

-- ===== Disposisi =====
create table public.letter_dispositions (
  id uuid primary key default gen_random_uuid(),
  incoming_letter_id uuid not null references public.incoming_letters(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id),
  instruction text not null,
  priority text not null default 'NORMAL' check (priority in ('RENDAH','NORMAL','TINGGI','MENDESAK')),
  due_date date,
  status text not null default 'MENUNGGU' check (status in ('MENUNGGU','DITERIMA','DALAM_PROSES','SELESAI')),
  completed_note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.letter_dispositions (assigned_to, status);
create index on public.letter_dispositions (incoming_letter_id);

create table public.disposition_responses (
  id uuid primary key default gen_random_uuid(),
  disposition_id uuid not null references public.letter_dispositions(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  note text,
  status_after text not null,
  created_at timestamptz not null default now()
);

-- ===== Penomoran =====
create table public.numbering_counters (
  scope text not null,       -- mis. 'OUTGOING'
  period text not null,      -- '2026', '2026-11', atau 'ALL'
  last_value int not null default 0,
  primary key (scope, period)
);

-- ===== Arsip =====
create table public.archive_records (
  id uuid primary key default gen_random_uuid(),
  incoming_letter_id uuid unique references public.incoming_letters(id),
  outgoing_letter_id uuid unique references public.outgoing_letters(id),
  archived_by uuid not null references public.profiles(id),
  archived_at timestamptz not null default now(),
  retention_note text,
  check ((incoming_letter_id is not null)::int + (outgoing_letter_id is not null)::int = 1)
);

-- ===== Notifikasi & audit =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,        -- tidak boleh memuat isi surat rahasia
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, read_at, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);
create index on public.audit_logs (entity_type, entity_id);
