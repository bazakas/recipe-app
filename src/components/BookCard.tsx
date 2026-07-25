"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBook, renameBook, setBookCover, leaveBook } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PromptDialog } from "@/components/PromptDialog";
import { BookCoverDialog } from "@/components/BookCoverDialog";
import { CardMenu } from "@/components/CardMenu";

export type BookCardData = {
  id: string;
  name: string;
  role: string;
  recipeCount: number;
  memberCount: number;
  coverImage?: string | null;
  fallbackImage?: string | null;
};

export function BookCard({ book }: { book: BookCardData }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = book.role === "owner";
  const recipeLabel = `${book.recipeCount} ${book.recipeCount === 1 ? "recipe" : "recipes"}`;
  const shared = book.memberCount > 1;
  const cover = book.coverImage || book.fallbackImage || null;

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

  async function onSaveCover(url: string) {
    setPending(true);
    setError(null);
    const res = await setBookCover(book.id, url);
    setPending(false);
    if (res.ok) {
      setCoverOpen(false);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  async function onLeave() {
    setPending(true);
    setError(null);
    const res = await leaveBook(book.id);
    if (res.ok) {
      setLeaveOpen(false);
      router.refresh();
    } else {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5">
      {/* Stretched link covers the card without nesting the menu button. */}
      <Link href={`/books/${book.id}`} aria-label={book.name} className="absolute inset-0 z-[1]" />

      <div className="flex aspect-[3/2] items-center justify-center overflow-hidden bg-accent-soft">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-title text-5xl text-accent">
            {book.name.charAt(0).toUpperCase()}
          </span>
        )}
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

      <div className="absolute right-2 top-2 z-[2]">
        <CardMenu
          label={`Options for ${book.name}`}
          items={
            isOwner
              ? [
                  {
                    label: "Rename",
                    onClick: () => {
                      setError(null);
                      setRenameOpen(true);
                    },
                  },
                  {
                    label: book.coverImage ? "Change photo" : "Add photo",
                    onClick: () => {
                      setError(null);
                      setCoverOpen(true);
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
                ]
              : [
                  {
                    label: "Leave book",
                    danger: true,
                    onClick: () => {
                      setError(null);
                      setLeaveOpen(true);
                    },
                  },
                ]
          }
        />
      </div>

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

      <BookCoverDialog
        open={coverOpen}
        initialValue={book.coverImage ?? ""}
        hasCustomCover={Boolean(book.coverImage)}
        pending={pending}
        error={error}
        onConfirm={onSaveCover}
        onCancel={() => setCoverOpen(false)}
      />

      <ConfirmDialog
        open={leaveOpen}
        title={`Leave “${book.name}”?`}
        confirmLabel="Leave book"
        pendingLabel="Leaving…"
        pending={pending}
        error={error}
        onConfirm={onLeave}
        onCancel={() => setLeaveOpen(false)}
      >
        You&apos;ll lose access to this shared book and its recipes. You can rejoin
        later with an invite link.
      </ConfirmDialog>

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
