"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * A centered confirmation modal, rendered via a portal to document.body so it's
 * never clipped or repositioned by transformed/overflow-hidden ancestors (e.g.
 * cards that animate on hover). Used for all destructive confirmations.
 */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  pending = false,
  error = null,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string | null;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
      onClick={() => !pending && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-title text-2xl">{title}</h2>
        <div className="mt-2 text-sm text-ink">{children}</div>
        {error && <p className="mt-3 text-sm text-hot">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-hot px-4 py-2 text-sm font-semibold text-hot-fg disabled:opacity-60"
          >
            {pending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
