import "server-only";
import { createClient } from "@/lib/supabase/server";

type Sb = ReturnType<typeof createClient>;

export async function getProfileMap(sb: Sb, ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (!uniq.length) return {};
  const { data } = await sb.from("profiles").select("id, full_name").in("id", uniq);
  return Object.fromEntries((data ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name || "Tanpa nama"]));
}

export async function getCategories(sb: Sb, kind: "incoming" | "outgoing") {
  const { data } = await sb.from("letter_categories").select("id, code, name").eq("kind", kind).eq("is_active", true).order("name");
  return (data ?? []) as { id: string; code: string; name: string }[];
}

export async function getAssignableUsers(sb: Sb) {
  const { data: rp } = await sb.from("role_permissions").select("role_code").eq("permission_code", "letters.disposition.respond");
  const roles = Array.from(new Set((rp ?? []).map((r: { role_code: string }) => r.role_code)));
  if (!roles.length) return [];
  const { data } = await sb.from("profiles").select("id, full_name, role_code").in("role_code", roles).eq("is_active", true).order("full_name");
  return (data ?? []) as { id: string; full_name: string; role_code: string }[];
}

export async function getAttachments(sb: Sb, kind: "incoming" | "outgoing", id: string) {
  const col = kind === "incoming" ? "incoming_letter_id" : "outgoing_letter_id";
  const { data } = await sb.from("letter_attachments").select("id, file_name, mime_type, size_bytes, created_at, uploaded_by").eq(col, id).order("created_at");
  return (data ?? []) as { id: string; file_name: string; mime_type: string; size_bytes: number; created_at: string; uploaded_by: string }[];
}

export async function getAuditTrail(sb: Sb, entityType: string, id: string) {
  const { data } = await sb.from("audit_logs").select("id, action, actor_id, metadata, created_at").eq("entity_type", entityType).eq("entity_id", id).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as { id: number; action: string; actor_id: string | null; metadata: Record<string, unknown>; created_at: string }[];
}
