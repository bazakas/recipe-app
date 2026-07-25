"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Modal for setting a book's cover photo by image URL, with a live preview.
 * Submitting an empty value clears the custom cover (the card then falls back
 * to a recipe photo, or the book's initial).
 */
export function BookCoverDialog({
  open,
  initialValue,
  hasCustomCover,
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  initialValue: string;
  hasCustomCover: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: (value: string) => void;
  onCancel: () => void;
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

  const preview = /^https?:\/\//i.test(value.trim()) ? value.trim() : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onClick={() => !pending && onCancel()}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(value.trim());
        }}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
      >
        <h2 className="font-title text-2xl">Book photo</h2>
        <div className="mt-4 aspect-[3/2] w-full overflow-hidden rounded-xl border border-line bg-accent-soft">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Cover preview" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted">
              Paste an image link to preview it
            </div>
          )}
        </div>
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="label-caps">Image URL</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://…"
            className="field-input"
          />
          <span className="text-xs text-muted">
            Leave blank to use a recipe photo from the book, or the book&apos;s initial.
          </span>
        </label>
        {error && <p className="mt-3 text-sm text-hot">{error}</p>}
        <div className="mt-5 flex items-center justify-end gap-2">
          {hasCustomCover && (
            <button
              type="button"
              onClick={() => onConfirm("")}
              disabled={pending}
              className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-hot hover:underline disabled:opacity-60"
            >
              Remove photo
            </button>
          )}
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
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
