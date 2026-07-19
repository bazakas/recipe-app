"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBook, renameBook } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PromptDialog } from "@/components/PromptDialog";
import { CardMenu } from "@/components/CardMenu";

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
  const [renameOpen, setRenameOpen] = useState(false);
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

  async function onRename(name: string) {
    setPending(true);
    setError(null);
    const res = await renameBook(book.id, name);
    setPending(false);
    if (res.ok) {
      setRenameOpen(false);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5">
      {/* Stretched link covers the card without nesting the menu button. */}
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
        <div className="absolute right-2 top-2 z-[2]">
          <CardMenu
            label={`Options for ${book.name}`}
            items={[
              {
                label: "Rename",
                onClick: () => {
                  setError(null);
                  setRenameOpen(true);
                },
              },
              {
                label: "Delete book",
                danger: true,
                onClick: () => {
                  setError(null);
                  setConfirmOpen(true);
                },
              },
            ]}
          />
        </div>
      )}

      <PromptDialog
        open={renameOpen}
        title="Rename book"
        label="Book name"
        initialValue={book.name}
        confirmLabel="Save"
        pending={pending}
        error={error}
        onConfirm={onRename}
        onCancel={() => setRenameOpen(false)}
      />

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
