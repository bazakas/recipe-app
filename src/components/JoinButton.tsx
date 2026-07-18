"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinByToken } from "@/lib/actions";

export function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setPending(true);
    setError(null);
    const res = await joinByToken(token);
    if (res.ok) {
      router.push(`/books/${res.bookId}`);
      router.refresh();
    } else {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        onClick={join}
        disabled={pending}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join book"}
      </button>
      {error && <p className="mt-3 text-sm text-hot">{error}</p>}
    </div>
  );
}
