"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AddRecipeDialog } from "@/components/AddRecipeDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { createBook } from "@/lib/actions";
import type { Role } from "@/lib/authz";

export type HeaderBook = {
  id: string;
  name: string;
  role: Role;
  recipeCount: number;
  memberCount: number;
};

export function AppHeader({
  books,
  activeBookId,
  userLabel,
}: {
  books: HeaderBook[];
  activeBookId?: string;
  userLabel: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const avatarImage = session?.user?.image ?? null;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // No fallback: on the home page there is no active book, so book-specific
  // controls (switcher, share, add) are hidden.
  const active = activeBookId ? books.find((b) => b.id === activeBookId) : undefined;
  const canEditActive = active && active.role !== "viewer";

  async function onCreateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createBook(newName);
    setCreating(false);
    if (res.ok) {
      setNewName("");
      setSwitcherOpen(false);
      router.push(`/books/${res.bookId}`);
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur no-print">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="font-title text-lg font-semibold shrink-0 hover:opacity-75">
          Recipe&nbsp;Book
        </Link>

        {/* Quick book switcher (only when viewing a book) */}
        {active && (
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
              aria-haspopup="menu"
              aria-expanded={switcherOpen}
            >
              <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
              <span className="max-w-[9rem] truncate">{active.name}</span>
              <span className="text-xs text-muted">▾</span>
            </button>

            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow)]">
                  <p className="label-caps px-2.5 py-1.5">Your books</p>
                  {books.map((b) => (
                    <Link
                      key={b.id}
                      href={`/books/${b.id}`}
                      onClick={() => setSwitcherOpen(false)}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2 ${
                        b.id === active.id ? "bg-surface-2" : ""
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted">
                        {b.recipeCount} {b.recipeCount === 1 ? "recipe" : "recipes"}
                        {b.memberCount > 1 ? " · shared" : ""}
                      </span>
                    </Link>
                  ))}
                  <Link
                    href="/"
                    onClick={() => setSwitcherOpen(false)}
                    className="mt-1 block border-t border-line px-2.5 pt-2 pb-1 text-sm text-accent hover:underline"
                  >
                    View all books →
                  </Link>
                  <form onSubmit={onCreateBook} className="mt-1 flex gap-1.5 border-t border-line p-1.5 pt-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="New book name"
                      className="field-input py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={creating}
                      className="shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg disabled:opacity-60"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {active && (
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
          {active && canEditActive && (
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
            >
              + Add recipe
            </button>
          )}
          <ThemeToggle />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-line bg-surface-2 text-sm font-semibold uppercase"
              aria-label="Account menu"
            >
              {avatarImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarImage} alt="" className="h-full w-full object-cover" />
              ) : (
                userLabel.charAt(0)
              )}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1.5 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow)]">
                  <p className="truncate px-2.5 py-1.5 text-xs text-muted">{userLabel}</p>
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2"
                  >
                    All recipe books
                  </Link>
                  <Link
                    href="/settings/account"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2"
                  >
                    Account settings
                  </Link>
                  <Link
                    href="/settings/weights"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2"
                  >
                    Custom weights
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-hot hover:bg-surface-2"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {active && (
        <>
          <AddRecipeDialog bookId={active.id} open={addOpen} onClose={() => setAddOpen(false)} />
          <ShareDialog
            bookId={active.id}
            bookName={active.name}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
          />
        </>
      )}
    </header>
  );
}
