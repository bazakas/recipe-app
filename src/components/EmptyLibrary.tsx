"use client";

import { useState } from "react";
import { AddRecipeDialog } from "@/components/AddRecipeDialog";

export function EmptyLibrary({
  bookId,
  canEdit,
}: {
  bookId: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center">
      <span className="font-title text-5xl opacity-40">🧑‍🍳</span>
      <h2 className="mt-4 font-title text-2xl">No recipes yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {canEdit
          ? "Paste a link to any recipe online and it'll be saved here, ready to scale and convert."
          : "Recipes added to this book will show up here."}
      </p>
      {canEdit && (
        <button
          onClick={() => setOpen(true)}
          className="mt-5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"
        >
          + Add your first recipe
        </button>
      )}
      <AddRecipeDialog bookId={bookId} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
