"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBook } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export type BookCardData = {
  id: string;
  name: string;
  role: string;
  recipeCount: number;
  memberCount: number;
};

export function BookCard({ book }: { book: BookCardData }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = book.role === "owner";
  const recipeLabel = `${book.recipeCount} ${book.recipeCount === 1 ? "recipe" : "recipes"}`;
  const shared = book.memberCount > 1;

  async function onDelete() {
    setPending(true);
    setError(null);
    const res = await deleteBook(book.id);
    if (res.ok) {
      setConfirmOpen(false);
      router.refresh();
    } else {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5">
      {/* Stretched link covers the card without nesting the delete button. */}
      <Link href={`/books/${book.id}`} aria-label={book.name} className="absolute inset-0 z-[1]" />

      <div className="flex aspect-[3/2] items-center justify-center bg-accent-soft">
        <span className="font-title text-5xl text-accent">
          {book.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-title text-xl leading-snug">{book.name}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{recipeLabel}</span>
          {shared && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5">
              Shared · {book.memberCount} members
            </span>
          )}
          {isOwner && (
            <span className="rounded-full border border-line px-2 py-0.5">Owner</span>
          )}
        </p>
      </div>

      {isOwner && (
        <button
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          aria-label={`Delete ${book.name}`}
          className="absolute right-2 top-2 z-[2] grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete “${book.name}”?`}
        confirmLabel={`Delete book & ${recipeLabel}`}
        pending={pending}
        error={error}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        This permanently deletes this book and <strong>{recipeLabel}</strong>{" "}
        inside it. This can&apos;t be undone.
        {shared && (
          <span className="mt-2 block rounded-lg bg-surface-2 px-3 py-2 text-muted">
            This book is shared with {book.memberCount - 1}{" "}
            {book.memberCount - 1 === 1 ? "other person" : "other people"} — it will be
            removed for everyone.
          </span>
        )}
      </ConfirmDialog>
    </div>
  );
}
