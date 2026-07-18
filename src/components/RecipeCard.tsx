"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRecipe } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type CardRecipe = {
  id: string;
  title: string;
  imageUrl: string | null;
  totalTime: string | null;
  servingsText: string | null;
  _count: { ingredients: number };
};

export function RecipeCard({
  recipe,
  canEdit,
}: {
  recipe: CardRecipe;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setConfirmOpen(true);
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    const res = await deleteRecipe(recipe.id);
    if (res.ok) {
      setConfirmOpen(false);
      router.refresh();
    } else {
      setPending(false);
      setError(res.error);
    }
  }

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <span className="font-title text-4xl opacity-40">🍳</span>
          </div>
        )}
        {canEdit && (
          <button
            onClick={openConfirm}
            aria-label="Delete recipe"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-title text-lg leading-snug">{recipe.title}</h2>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {recipe.totalTime && <span>⏱ {recipe.totalTime}</span>}
          {recipe.servingsText && <span>🍽 {recipe.servingsText}</span>}
          <span>{recipe._count.ingredients} ingredients</span>
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete “${recipe.title}”?`}
        confirmLabel="Delete recipe"
        pending={pending}
        error={error}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        This permanently deletes this recipe. This can&apos;t be undone.
      </ConfirmDialog>
    </Link>
  );
}
