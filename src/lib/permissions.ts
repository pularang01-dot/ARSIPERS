export const PERMISSIONS = [
  "letters.incoming.view", "letters.incoming.create", "letters.incoming.update", "letters.incoming.delete",
  "letters.outgoing.view", "letters.outgoing.create", "letters.outgoing.update", "letters.outgoing.submit", "letters.outgoing.approve",
  "letters.disposition.create", "letters.disposition.respond",
  "archives.view", "archives.manage", "archives.delete", "reports.view", "users.manage", "settings.manage", "audit_logs.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ["SUPER_ADMIN", "KEPALA_SEKOLAH", "OPERATOR_TU", "GURU", "KOORDINATOR", "ARSIPARIS"] as const;
export type RoleCode = (typeof ROLES)[number];

export const ROLE_LABEL: Record<RoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  KEPALA_SEKOLAH: "Kepala Sekolah",
  OPERATOR_TU: "Operator TU",
  GURU: "Guru",
  KOORDINATOR: "Koordinator",
  ARSIPARIS: "Arsiparis",
};

export function can(perms: readonly string[] | Set<string>, p: Permission): boolean {
  return perms instanceof Set ? perms.has(p) : perms.includes(p);
}
export function canAny(perms: readonly string[] | Set<string>, list: Permission[]): boolean {
  return list.some((p) => can(perms, p));
}