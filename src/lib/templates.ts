export const TEMPLATE_PLACEHOLDERS = ["recipient", "subject", "date", "school_name", "principal_name", "principal_nip"] as const;
export type TemplateData = Partial<Record<(typeof TEMPLATE_PLACEHOLDERS)[number], string | null | undefined>>;

/** Placeholder bentuk {{nama}}. Hanya nama yang dikenal yang diganti; sisanya dibiarkan agar terlihat saat pratinjau. */
export function renderTemplate(body: string, data: TemplateData): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, key: string) => {
    if (!(TEMPLATE_PLACEHOLDERS as readonly string[]).includes(key)) return m;
    const v = data[key as (typeof TEMPLATE_PLACEHOLDERS)[number]];
    return v ? String(v) : m;
  });
}

export function unknownPlaceholders(body: string): string[] {
  const found = Array.from(body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)).map((m) => m[1]);
  return Array.from(new Set(found.filter((k) => !(TEMPLATE_PLACEHOLDERS as readonly string[]).includes(k))));
}
