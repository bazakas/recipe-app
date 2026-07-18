"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createShareLink,
  revokeShareLink,
  leaveOrRemoveMember,
} from "@/lib/actions";

type Member = { id: string; name: string | null; email: string; role: string };
type ShareLink = { id: string; token: string; role: string };

export function SharePanel({
  bookId,
  role,
  viewerId,
  members,
  shareLinks,
  onChanged,
}: {
  bookId: string;
  role: string;
  viewerId: string;
  members: Member[];
  shareLinks: ShareLink[];
  // Called after a successful mutation. In a modal this re-fetches the data;
  // on the standalone page it falls back to a router refresh.
  onChanged?: () => void;
}) {
  const router = useRouter();
  const isOwner = role === "owner";
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = onChanged ?? (() => router.refresh());

  function linkUrl(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join/${token}`;
  }

  async function onCreate() {
    setCreating(true);
    // Share links grant "member" today; viewer role is enabled later.
    const res = await createShareLink(bookId, "member");
    setCreating(false);
    if (res.ok) {
      await copy(res.token);
      refresh();
    } else alert(res.error);
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(linkUrl(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000);
    } catch {
      /* clipboard may be blocked; the link is still visible to copy manually */
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this invite link? Anyone holding it will lose access to join.")) return;
    const res = await revokeShareLink(id);
    if (res.ok) refresh();
    else alert(res.error);
  }

  async function onRemove(userId: string, self: boolean) {
    const msg = self
      ? "Leave this book? You'll lose access to its recipes."
      : "Remove this person from the book?";
    if (!confirm(msg)) return;
    const res = await leaveOrRemoveMember(bookId, userId);
    if (res.ok) {
      if (self) {
        router.push("/");
        router.refresh();
      } else refresh();
    } else alert(res.error);
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {isOwner && (
        <section>
          <h2 className="label-caps mb-3">Invite links</h2>
          <div className="flex flex-col gap-2">
            {shareLinks.length === 0 && (
              <p className="text-sm text-muted">
                No active invite links. Create one to share this book.
              </p>
            )}
            {shareLinks.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <input
                  readOnly
                  value={linkUrl(l.token)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-transparent text-sm text-muted outline-none"
                />
                <button
                  onClick={() => copy(l.token)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                >
                  {copied === l.token ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => onRevoke(l.id)}
                  className="rounded-md px-2 py-1 text-xs text-hot hover:underline"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={onCreate}
            disabled={creating}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {creating ? "Creating…" : "+ Create invite link"}
          </button>
          <p className="mt-2 text-xs text-muted">
            Anyone with the link can join and add or remove recipes.
          </p>
        </section>
      )}

      <section>
        <h2 className="label-caps mb-3">Members</h2>
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {members.map((m) => {
            const self = m.id === viewerId;
            const canRemove = (isOwner && !self) || self;
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-sm font-semibold uppercase">
                  {(m.name || m.email).charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name || m.email} {self && <span className="text-muted">(you)</span>}
                  </p>
                  {m.name && <p className="truncate text-xs text-muted">{m.email}</p>}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    m.role === "owner"
                      ? "bg-accent-soft text-accent"
                      : "border border-line text-muted"
                  }`}
                >
                  {m.role}
                </span>
                {canRemove && (
                  <button
                    onClick={() => onRemove(m.id, self)}
                    className="text-xs text-hot hover:underline"
                  >
                    {self ? "Leave" : "Remove"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
