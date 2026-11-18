"use client";
import { useId, useRef } from "react";
import { buttonClass } from "@/components/ui";

/** Tombol dengan dialog konfirmasi (native <dialog>: fokus dan Esc ditangani browser). */
export function ConfirmButton({ label, title, message, confirmLabel, variant = "danger", children, formAction }: {
  label: string; title: string; message: string; confirmLabel: string; variant?: "primary" | "danger"; children?: React.ReactNode;
  /** Server action khusus untuk tombol konfirmasi (menggantikan action form induk). */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  return (
    <>
      <button type="button" className={buttonClass(variant === "danger" ? "secondary" : "primary", variant === "danger" ? "text-bad" : "")} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} aria-labelledby={uid} className="w-[min(92vw,26rem)] rounded-lg border border-line p-0 backdrop:bg-navy-950/40">
        <div className="space-y-3 p-5">
          <h2 id={uid} className="font-display text-lg font-semibold text-navy-900">{title}</h2>
          <p className="text-sm text-ink-soft">{message}</p>
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={buttonClass("secondary")} onClick={() => ref.current?.close()}>Batal</button>
            <button type="submit" formAction={formAction} formNoValidate={!!formAction} className={buttonClass(variant)}>{confirmLabel}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}