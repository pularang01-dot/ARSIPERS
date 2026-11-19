import { cn } from "@/lib/utils";

export const COPYRIGHT_TEXT = "© 2026 Viky Aditama dalam Program PPL Universitas PGRI Sumenep";

export function Copyright({ className }: { className?: string }) {
  return <p className={cn("text-xs text-ink-mute", className)}>{COPYRIGHT_TEXT}</p>;
}