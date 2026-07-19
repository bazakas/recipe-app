"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** A small modal with a single text input — e.g. renaming. Portal-rendered. */
export function PromptDialog({
  open,
  title,
  label,
  initialValue,
  confirmLabel = "Save",
  placeholder,
  onConfirm,
  onCancel,
  pending = false,
  error = null,
}: {
  open: boolean;
  title: string;
  label: string;
  initialValue: string;
  confirmLabel?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string | null;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

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
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onConfirm(value.trim());
        }}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
      >
        <h2 className="font-title text-2xl">{title}</h2>
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="label-caps">{label}</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="field-input"
          />
        </label>
        {error && <p className="mt-3 text-sm text-hot">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !value.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {pending ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
