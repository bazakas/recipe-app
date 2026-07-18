"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatQuantity } from "@/lib/quantity";
import { unitLabel, unitKind, type CanonicalUnit } from "@/lib/units";
import { computeGrams, roundGrams } from "@/lib/convert";
import { deleteRecipe, addCustomWeight } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Conversion = {
  gramsPerCup: number | null;
  matchedName: string | null;
  matchSource: "custom" | "chart" | null;
  matchScore: number | null;
};
type Ingredient = {
  id: string;
  raw: string;
  quantity: number | null;
  quantityMax: number | null;
  unit: CanonicalUnit | null;
  name: string | null;
  note: string | null;
  conversion: Conversion;
};
type Recipe = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  servings: number | null;
  servingsText: string | null;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  instructions: string[];
  addedBy: { name: string | null; email: string } | null;
  book: { id: string; name: string };
  role: string;
  ingredients: Ingredient[];
};

const PRESETS = [0.5, 1, 1.5, 2, 3];

export function RecipeView({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [factor, setFactor] = useState(1);
  const [grams, setGrams] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canEdit = recipe.role !== "viewer";

  const scaledServings =
    recipe.servings != null ? Math.round(recipe.servings * factor * 100) / 100 : null;

  async function onDelete() {
    setDeletePending(true);
    setDeleteError(null);
    const res = await deleteRecipe(recipe.id);
    if (res.ok) {
      router.push(`/books/${recipe.book.id}`);
      router.refresh();
    } else {
      setDeletePending(false);
      setDeleteError(res.error);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href={`/books/${recipe.book.id}`} className="text-muted hover:text-ink">
          ← {recipe.book.name}
        </Link>
        {canEdit && (
          <button
            onClick={() => {
              setDeleteError(null);
              setConfirmOpen(true);
            }}
            className="text-hot hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete “${recipe.title}”?`}
        confirmLabel="Delete recipe"
        pending={deletePending}
        error={deleteError}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        This permanently removes this recipe from {recipe.book.name}. This can&apos;t be
        undone.
      </ConfirmDialog>

      {recipe.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="mb-5 aspect-[16/9] w-full rounded-2xl border border-line object-cover"
        />
      )}

      <h1 className="font-title text-4xl leading-tight">{recipe.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-line-strong pb-4 text-sm text-muted">
        {recipe.prepTime && <span><b className="text-ink">Prep</b> {recipe.prepTime}</span>}
        {recipe.cookTime && <span><b className="text-ink">Cook</b> {recipe.cookTime}</span>}
        {recipe.totalTime && <span><b className="text-ink">Total</b> {recipe.totalTime}</span>}
        {recipe.servingsText && !recipe.servings && (
          <span><b className="text-ink">Makes</b> {recipe.servingsText}</span>
        )}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-accent hover:underline"
          >
            Source ↗
          </a>
        )}
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setFactor(p)}
              aria-pressed={Math.abs(factor - p) < 0.001}
              className={`tnum border-r border-line px-3 py-1.5 text-sm font-medium last:border-r-0 ${
                Math.abs(factor - p) < 0.001
                  ? "bg-accent text-accent-fg"
                  : "bg-surface hover:bg-surface-2"
              }`}
            >
              {p === 1 ? "1×" : `${formatQuantity(p)}×`}
            </button>
          ))}
        </div>

        {scaledServings != null && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-line px-2 py-1 text-sm">
            <button
              onClick={() =>
                setFactor((f) =>
                  Math.max(1 / recipe.servings!, f - 1 / recipe.servings!),
                )
              }
              className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface-2"
              aria-label="Fewer servings"
            >
              −
            </button>
            <span className="tnum min-w-[5.5rem] text-center">
              Serves {formatQuantity(scaledServings)}
            </span>
            <button
              onClick={() => setFactor((f) => f + 1 / recipe.servings!)}
              className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface-2"
              aria-label="More servings"
            >
              +
            </button>
          </div>
        )}

        <button
          onClick={() => setGrams((g) => !g)}
          aria-pressed={grams}
          className={`ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${
            grams
              ? "border-hot bg-hot text-hot-fg"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          <span>Grams</span>
          <span
            className={`relative h-4 w-7 rounded-full transition-colors ${
              grams ? "bg-hot-fg/40" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface transition-all ${
                grams ? "left-3.5" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr]">
        {/* Ingredients */}
        <section>
          <h2 className="label-caps mb-3">Ingredients</h2>
          <ul className="flex flex-col">
            {recipe.ingredients.map((ing) => (
              <IngredientRow key={ing.id} ing={ing} factor={factor} grams={grams} />
            ))}
          </ul>
        </section>

        {/* Method */}
        <section>
          <h2 className="label-caps mb-3">Method</h2>
          {recipe.instructions.length === 0 ? (
            <p className="text-sm text-muted">
              No steps were found for this recipe.{" "}
              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  View the original ↗
                </a>
              )}
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-title text-lg font-semibold text-hot tnum">{i + 1}.</span>
                  <p className="font-serif text-[15px] leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

function IngredientRow({
  ing,
  factor,
  grams,
}: {
  ing: Ingredient;
  factor: number;
  grams: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const display = useMemo(() => renderAmount(ing, factor, grams), [ing, factor, grams]);

  const isVolume = ing.unit != null && unitKind(ing.unit) === "volume";
  const showSetWeight =
    grams && ing.quantity != null && isVolume && ing.conversion.gramsPerCup == null;

  return (
    <li className="grid grid-cols-[7rem_1fr] items-baseline gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="tnum font-mono text-sm font-semibold text-accent">
        {display.amount || <span className="text-muted">—</span>}
      </span>
      <span className="text-[15px]">
        {ing.name ?? ing.raw}
        {ing.note && <span className="text-muted">, {ing.note}</span>}
        {showSetWeight &&
          (adding ? (
            <SetWeightForm
              name={ing.name ?? ing.raw}
              onDone={() => {
                setAdding(false);
                router.refresh();
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="ml-2 text-xs text-accent hover:underline"
            >
              + set weight
            </button>
          ))}
      </span>
    </li>
  );
}

function renderAmount(
  ing: Ingredient,
  factor: number,
  grams: boolean,
): { amount: string | null } {
  if (ing.quantity == null) return { amount: null };
  const scaled = ing.quantity * factor;
  const scaledMax = ing.quantityMax != null ? ing.quantityMax * factor : null;

  if (grams) {
    const g = computeGrams(scaled, ing.unit, ing.conversion.gramsPerCup);
    if (g != null) {
      const gMax =
        scaledMax != null
          ? computeGrams(scaledMax, ing.unit, ing.conversion.gramsPerCup)
          : null;
      return {
        amount: gMax != null ? `${roundGrams(g)}–${roundGrams(gMax)} g` : `${roundGrams(g)} g`,
      };
    }
    // no conversion available — fall through to original amount
  }

  const amtStr =
    formatQuantity(scaled) + (scaledMax != null ? `–${formatQuantity(scaledMax)}` : "");
  const lbl = ing.unit ? " " + unitLabel(ing.unit, scaled) : "";
  return { amount: amtStr + lbl };
}

function SetWeightForm({
  name,
  onDone,
  onCancel,
}: {
  name: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const grams = Number(value);
    setPending(true);
    setError(null);
    const res = await addCustomWeight(name, grams);
    setPending(false);
    if (res.ok) onDone();
    else setError(res.error);
  }

  return (
    <form onSubmit={submit} className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <input
        type="number"
        step="any"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="grams per cup"
        className="field-input w-32 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg disabled:opacity-60"
      >
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-muted hover:text-ink">
        Cancel
      </button>
      {error && <span className="w-full text-xs text-hot">{error}</span>}
    </form>
  );
}
