"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addRecipeFromUrl } from "@/lib/actions";

type Tab = "link" | "search";
type SearchResult = {
  title: string;
  url: string;
  description: string;
  source: string | null;
  thumbnail: string | null;
};

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
  const [tab, setTab] = useState<Tab>("link");

  // Link tab
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPending, setLinkPending] = useState(false);

  // Search tab
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setUrl("");
    setLinkError(null);
    setQuery("");
    setResults(null);
    setSearchError(null);
    setAddingUrl(null);
  }
  function close() {
    reset();
    onClose();
  }

  async function addFromUrl(target: string) {
    const res = await addRecipeFromUrl(bookId, target);
    if (res.ok) {
      close();
      router.push(`/recipes/${res.recipeId}`);
      router.refresh();
      return null;
    }
    return res.error;
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError(null);
    setLinkPending(true);
    const err = await addFromUrl(url);
    setLinkPending(false);
    if (err) setLinkError(err);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(
          data.code === "not_configured"
            ? "Web search isn't set up yet."
            : data.error ?? "Search failed.",
        );
      } else {
        setResults(data.results as SearchResult[]);
      }
    } catch {
      setSearchError("Search failed. Please try again.");
    }
    setSearching(false);
  }

  async function addResult(target: string) {
    setSearchError(null);
    setAddingUrl(target);
    const err = await addFromUrl(target);
    if (err) {
      setAddingUrl(null);
      setSearchError(err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh]"
      onClick={close}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-title text-2xl">Add a recipe</h2>

        {/* Tabs */}
        <div className="mt-3 inline-flex self-start overflow-hidden rounded-lg border border-line">
          {(["link", "search"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`px-3 py-1.5 text-sm font-medium ${
                tab === t ? "bg-accent text-accent-fg" : "bg-surface hover:bg-surface-2"
              }`}
            >
              {t === "link" ? "Paste link" : "Search the web"}
            </button>
          ))}
        </div>

        {tab === "link" ? (
          <form onSubmit={submitLink} className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted">
              Paste a link to any recipe and we&apos;ll pull out the ingredients and steps.
            </p>
            <input
              type="url"
              autoFocus
              required
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="field-input"
            />
            {linkError && <p className="text-sm text-hot">{linkError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={linkPending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
              >
                {linkPending ? "Reading recipe…" : "Add recipe"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex min-h-0 flex-col gap-3">
            <form onSubmit={runSearch} className="flex gap-2">
              <input
                autoFocus
                placeholder="e.g. banana bread, chicken tikka masala"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="field-input"
              />
              <button
                type="submit"
                disabled={searching}
                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
              >
                {searching ? "…" : "Search"}
              </button>
            </form>

            {searchError && <p className="text-sm text-hot">{searchError}</p>}

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {results && results.length === 0 && !searching && (
                <p className="text-sm text-muted">No results. Try different words.</p>
              )}
              {results && results.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {results.map((r) => (
                    <li key={r.url}>
                      <button
                        onClick={() => addResult(r.url)}
                        disabled={addingUrl != null}
                        className="flex w-full items-start gap-3 rounded-lg border border-transparent p-2 text-left hover:border-line hover:bg-surface-2 disabled:opacity-60"
                      >
                        {r.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.thumbnail}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-md border border-line object-cover"
                          />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-lg">
                            🍽
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-semibold">{r.title}</span>
                          {r.source && (
                            <span className="block text-xs text-accent">{r.source}</span>
                          )}
                          <span className="line-clamp-2 text-xs text-muted">
                            {r.description}
                          </span>
                        </span>
                        <span className="shrink-0 self-center text-xs font-medium text-muted">
                          {addingUrl === r.url ? "Adding…" : "Add"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
          No link?{" "}
          <Link
            href={`/books/${bookId}/new`}
            onClick={close}
            className="font-medium text-accent hover:underline"
          >
            Enter a recipe manually
          </Link>
        </p>
      </div>
    </div>
  );
}
