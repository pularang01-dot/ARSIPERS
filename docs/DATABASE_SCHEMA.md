# Skema Basis Data (ringkas)
Lihat `supabase/migrations/0001_schema.sql`. Tabel: roles, permissions, role_permissions, profiles, school_settings,
letter_categories, incoming_letters, letter_templates(+versions), outgoing_letters, letter_versions, letter_approvals,
letter_deliveries, letter_attachments, letter_dispositions, disposition_responses, numbering_counters, archive_records,
notifications, audit_logs. RPC: admin_set_user, transition_incoming, delete_letter, create_disposition, respond_disposition,
transition_outgoing, finalize_outgoing_letter, revise_outgoing_letter, record_delivery, archive_letter, log_file_download, log_auth_event.
