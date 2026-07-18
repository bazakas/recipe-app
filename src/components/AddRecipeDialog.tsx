"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addRecipeFromUrl } from "@/lib/actions";

export function AddRecipeDialog({
  bookId,
  open,
  onClose,
}: {
  bookId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await addRecipeFromUrl(bookId, url);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUrl("");
    onClose();
    router.push(`/recipes/${res.recipeId}`);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-title text-2xl">Add a recipe</h2>
        <p className="mt-1 text-sm text-muted">
          Paste a link to any recipe and we&apos;ll pull out the ingredients and steps.
        </p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input
            type="url"
            autoFocus
            required
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="field-input"
          />
          {error && <p className="text-sm text-hot">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
            >
              {pending ? "Reading recipe…" : "Add recipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
