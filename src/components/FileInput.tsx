"use client";
import { useState } from "react";
import { Upload, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Area unggah: input asli menutupi seluruh kotak sehingga klik dan seret-lepas bekerja, dan tetap dapat difokus keyboard. */
export function FileInput({ id, name = "file", accept = "application/pdf,image/jpeg,image/png", required, hint, compact }: {
  id: string; name?: string; accept?: string; required?: boolean; hint?: string; compact?: boolean;
}) {
  const [file, setFile] = useState("");
  return (
    <div className={cn("relative rounded-lg border-2 border-dashed text-center transition-colors focus-within:border-navy-600 focus-within:bg-navy-50 hover:border-navy-600 hover:bg-navy-50",
      file ? "border-ok/50 bg-ok-bg" : "border-line-strong bg-surface", compact ? "px-4 py-4" : "px-5 py-7")}>
      <input id={id} name={name} type="file" accept={accept} required={required} onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      <div className="pointer-events-none flex flex-col items-center gap-1.5">
        {file ? <FileCheck2 className="h-6 w-6 text-ok" aria-hidden /> : <Upload className="h-6 w-6 text-ink-mute" aria-hidden />}
        <p className="max-w-full truncate text-sm font-medium text-ink">{file || "Pilih berkas atau seret ke sini"}</p>
        {hint && !file && <p className="text-xs text-ink-mute">{hint}</p>}
      </div>
    </div>
  );
}