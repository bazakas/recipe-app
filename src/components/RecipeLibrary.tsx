"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveRecipes, deleteRecipes } from "@/lib/actions";
import { CardMenu } from "@/components/CardMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MoveRecipeDialog } from "@/components/MoveRecipeDialog";

export type LibraryRecipe = {
  id: string;
  title: string;
  imageUrl: string | null;
  totalTime: string | null;
  servingsText: string | null;
  _count: { ingredients: number };
};

type BookRef = { id: string; name: string; role: string };

export function RecipeLibrary({
  currentBookId,
  canEdit,
  books,
  recipes,
}: {
  currentBookId: string;
  canEdit: boolean;
  books: BookRef[];
  recipes: LibraryRecipe[];
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveIds, setMoveIds] = useState<string[] | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveTargets = books
    .filter((b) => b.id !== currentBookId && b.role !== "viewer")
    .map((b) => ({ id: b.id, name: b.name }));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function doMove(targetBookId: string) {
    if (!moveIds) return;
    setPending(true);
    setError(null);
    const res = await moveRecipes(moveIds, targetBookId);
    setPending(false);
    if (res.ok) {
      setMoveIds(null);
      exitSelect();
      router.refresh();
    } else setError(res.error);
  }

  async function doDelete() {
    if (!deleteIds) return;
    setPending(true);
    setError(null);
    const res = await deleteRecipes(deleteIds);
    setPending(false);
    if (res.ok) {
      setDeleteIds(null);
      exitSelect();
      router.refresh();
    } else setError(res.error);
  }

  return (
    <>
      {/* Selection toolbar */}
      {canEdit && recipes.length > 0 && (
        <div className="mb-4 flex min-h-9 items-center gap-2">
          {!selecting ? (
            <button
              onClick={() => setSelecting(true)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
            >
              Select
            </button>
          ) : (
            <>
              <span className="text-sm text-muted">{selected.size} selected</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  disabled={selected.size === 0}
                  onClick={() => {
                    setError(null);
                    setMoveIds([...selected]);
                  }}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
                >
                  Move
                </button>
                <button
                  disabled={selected.size === 0}
                  onClick={() => {
                    setError(null);
                    setDeleteIds([...selected]);
                  }}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-hot hover:bg-surface-2 disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  onClick={exitSelect}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r) => {
          const isSel = selected.has(r.id);
          return (
            <div
              key={r.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-[var(--shadow)] transition-transform ${
                isSel ? "border-accent ring-2 ring-accent" : "border-line"
              } ${selecting ? "" : "hover:-translate-y-0.5"}`}
            >
              {selecting ? (
                <button
                  onClick={() => toggle(r.id)}
                  aria-pressed={isSel}
                  aria-label={`${isSel ? "Deselect" : "Select"} ${r.title}`}
                  className="absolute inset-0 z-[2]"
                />
              ) : (
                <Link href={`/recipes/${r.id}`} className="absolute inset-0 z-[1]" />
              )}

              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt={r.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    <span className="font-title text-4xl opacity-40">🍳</span>
                  </div>
                )}

                {selecting && (
                  <span
                    className={`absolute left-2 top-2 z-[3] grid h-7 w-7 place-items-center rounded-full border-2 ${
                      isSel
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-white/90 bg-black/30 text-transparent"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}

                {!selecting && canEdit && (
                  <div className="absolute right-2 top-2 z-[3]">
                    <CardMenu
                      label={`Options for ${r.title}`}
                      items={[
                        {
                          label: "Move to another book",
                          onClick: () => {
                            setError(null);
                            setMoveIds([r.id]);
                          },
                        },
                        {
                          label: "Delete",
                          danger: true,
                          onClick: () => {
                            setError(null);
                            setDeleteIds([r.id]);
                          },
                        },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-title text-lg leading-snug">{r.title}</h2>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  {r.totalTime && <span>⏱ {r.totalTime}</span>}
                  {r.servingsText && <span>🍽 {r.servingsText}</span>}
                  <span>{r._count.ingredients} ingredients</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <MoveRecipeDialog
        open={moveIds !== null}
        books={moveTargets}
        count={moveIds?.length ?? 0}
        pending={pending}
        error={error}
        onConfirm={doMove}
        onCancel={() => setMoveIds(null)}
      />

      <ConfirmDialog
        open={deleteIds !== null}
        title={
          (deleteIds?.length ?? 0) === 1
            ? "Delete this recipe?"
            : `Delete ${deleteIds?.length ?? 0} recipes?`
        }
        confirmLabel={
          (deleteIds?.length ?? 0) === 1 ? "Delete recipe" : `Delete ${deleteIds?.length ?? 0} recipes`
        }
        pending={pending}
        error={error}
        onConfirm={doDelete}
        onCancel={() => setDeleteIds(null)}
      >
        This permanently removes{" "}
        {(deleteIds?.length ?? 0) === 1 ? "this recipe" : "these recipes"} from the book.
        This can&apos;t be undone.
      </ConfirmDialog>
    </>
  );
}
