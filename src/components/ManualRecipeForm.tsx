"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addManualRecipe } from "@/lib/actions";

export function ManualRecipeForm({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    servings: "",
    prepTime: "",
    cookTime: "",
    totalTime: "",
    imageUrl: "",
    ingredients: "",
    instructions: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await addManualRecipe(bookId, form);
    setPending(false);
    if (res.ok) {
      router.push(`/recipes/${res.recipeId}`);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
      <Field label="Title">
        <input
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Grandma's apple pie"
          className="field-input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Servings">
          <input
            value={form.servings}
            onChange={(e) => set("servings", e.target.value)}
            placeholder="8"
            className="field-input"
          />
        </Field>
        <Field label="Prep time">
          <input
            value={form.prepTime}
            onChange={(e) => set("prepTime", e.target.value)}
            placeholder="15 min"
            className="field-input"
          />
        </Field>
        <Field label="Cook time">
          <input
            value={form.cookTime}
            onChange={(e) => set("cookTime", e.target.value)}
            placeholder="45 min"
            className="field-input"
          />
        </Field>
        <Field label="Total time">
          <input
            value={form.totalTime}
            onChange={(e) => set("totalTime", e.target.value)}
            placeholder="1 hr"
            className="field-input"
          />
        </Field>
      </div>

      <Field label="Image URL (optional)">
        <input
          value={form.imageUrl}
          onChange={(e) => set("imageUrl", e.target.value)}
          placeholder="https://…"
          className="field-input"
        />
      </Field>

      <Field label="Ingredients" hint="One per line — e.g. “1 1/2 cups flour”">
        <textarea
          required
          value={form.ingredients}
          onChange={(e) => set("ingredients", e.target.value)}
          rows={8}
          placeholder={"1 1/2 cups all-purpose flour\n1 cup sugar\n1/2 cup butter, melted\n3 large eggs"}
          className="field-input font-mono text-sm leading-relaxed"
        />
      </Field>

      <Field label="Instructions" hint="One step per line">
        <textarea
          value={form.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          rows={8}
          placeholder={"Preheat oven to 350°F.\nWhisk the dry ingredients.\nFold in the wet ingredients and bake 45 minutes."}
          className="field-input text-sm leading-relaxed"
        />
      </Field>

      {error && <p className="text-sm text-hot">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save recipe"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/books/${bookId}`)}
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-caps">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
