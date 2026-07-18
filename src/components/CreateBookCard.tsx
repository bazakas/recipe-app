"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBook } from "@/lib/actions";

export function CreateBookCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    const res = await createBook(name);
    setPending(false);
    if (res.ok) {
      router.push(`/books/${res.bookId}`);
      router.refresh();
    } else setError(res.error);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-[13rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface/40 text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span className="text-3xl leading-none">+</span>
        <span className="text-sm font-medium">New recipe book</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-h-[13rem] flex-col justify-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]"
    >
      <label className="label-caps">New book name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Weeknight Dinners"
        className="field-input"
      />
      {error && <p className="text-sm text-hot">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create book"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
            setError(null);
          }}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
