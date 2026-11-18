import clsx, { type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(date);
}
export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(d));
}
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Bersihkan input pencarian agar aman dipakai di filter PostgREST .or()/ilike. */
export function sanitizeSearch(q: string | undefined | null): string {
  return (q ?? "").replace(/[,()%*\\_:"'`;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Cegah CSV/Excel formula injection. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function safeFileName(name: string): string {
  const base = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "_").replace(/\.{2,}/g, ".").replace(/^\.+/, "");
  return (base || "berkas").slice(0, 100);
}

/** Hanya izinkan path internal untuk parameter ?next= (cegah open redirect). */
export function safeNext(n: string | null | undefined): string {
  if (!n || !n.startsWith("/") || n.startsWith("//") || n.includes("\\")) return "/";
  return n;
}

export function firstParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

/** Tanggal hari ini (YYYY-MM-DD) menurut zona waktu Asia/Jakarta. */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}