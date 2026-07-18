"use client";

import { useCallback, useEffect, useState } from "react";
import { SharePanel } from "@/components/SharePanel";

type ShareData = {
  role: string;
  viewerId: string;
  members: { id: string; name: string | null; email: string; role: string }[];
  shareLinks: { id: string; token: string; role: string }[];
};

export function ShareDialog({
  bookId,
  bookName,
  open,
  onClose,
}: {
  bookId: string;
  bookName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/share-data`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("Couldn't load sharing details.");
    }
  }, [bookId]);

  useEffect(() => {
    if (open) {
      setData(null);
      load();
    }
  }, [open, load]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-title text-2xl">Share “{bookName}”</h2>
            <p className="mt-1 text-sm text-muted">
              Invite people to this book. Everyone shares the same recipes, like a shared
              photo album.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {error && <p className="mt-6 text-sm text-hot">{error}</p>}
        {!error && !data && (
          <p className="mt-6 text-sm text-muted">Loading…</p>
        )}
        {data && (
          <SharePanel
            bookId={bookId}
            role={data.role}
            viewerId={data.viewerId}
            members={data.members}
            shareLinks={data.shareLinks}
            onChanged={load}
          />
        )}
      </div>
    </div>
  );
}
