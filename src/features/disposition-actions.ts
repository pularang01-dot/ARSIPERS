"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { go, friendlyError } from "@/lib/flash";
import { respondSchema, zodFlat } from "@/lib/validation";

export async function respondDisposition(formData: FormData) {
  await requirePermission("letters.disposition.respond");
  const parsed = respondSchema.safeParse({ id: formData.get("id"), to: formData.get("to"), note: formData.get("note") ?? "" });
  const id = String(formData.get("id") ?? "");
  if (!parsed.success) go(`/disposisi/${id}`, "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const { error } = await createClient().rpc("respond_disposition", { p_id: d.id, p_to: d.to, p_note: d.note || null });
  if (error) go(`/disposisi/${id}`, "error", friendlyError(error));
  revalidatePath(`/disposisi/${id}`);
  go(`/disposisi/${id}`, "ok", "Status disposisi diperbarui");
}
