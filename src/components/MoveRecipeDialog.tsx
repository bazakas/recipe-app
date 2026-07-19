"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type BookOption = { id: string; name: string };

export function MoveRecipeDialog({
  open,
  books,
  count,
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  books: BookOption[];
  count: number;
  pending?: boolean;
  error?: string | null;
  onConfirm: (bookId: string) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (open) setTarget(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const label = count === 1 ? "this recipe" : `${count} recipes`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onClick={() => !pending && onCancel()}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-md flex-col rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-title text-2xl">Move {label}</h2>
        <p className="mt-1 text-sm text-muted">Choose a book to move to.</p>

        {books.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            You don&apos;t have another book to move to. Create one first.
          </p>
        ) : (
          <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {books.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setTarget(b.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                    target === b.id
                      ? "border-accent bg-accent-soft"
                      : "border-line hover:bg-surface-2"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-sm ${
                      target === b.id ? "bg-accent" : "bg-line"
                    }`}
                  />
                  <span className="truncate">{b.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

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
            type="button"
            disabled={pending || !target}
            onClick={() => target && onConfirm(target)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {pending ? "Moving…" : "Move"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
