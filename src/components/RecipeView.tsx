"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatQuantity } from "@/lib/quantity";
import { unitLabel, unitKind, type CanonicalUnit } from "@/lib/units";
import { computeGrams, computeCups, roundGrams } from "@/lib/convert";
import { resolveSpecialMeasure } from "@/lib/special-measures";
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
  modified: boolean;
  servings: number | null;
  servingsText: string | null;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  instructions: string[];
  notes: string | null;
  addedBy: { name: string | null; email: string } | null;
  book: { id: string; name: string };
  role: string;
  ingredients: Ingredient[];
};

type UnitMode = "grams" | "volume";

const PRESETS = [0.5, 1, 1.5, 2, 3];
const UNIT_MODES: { value: UnitMode; label: string }[] = [
  { value: "grams", label: "Grams" },
  { value: "volume", label: "Volume" },
];

/** Effective measure for an ingredient, applying special-case units. */
function effectiveMeasure(ing: Ingredient) {
  const gpc = ing.conversion.gramsPerCup;
  if (ing.quantity == null) {
    return { quantity: null, quantityMax: null, unit: ing.unit, gpc };
  }
  const special = resolveSpecialMeasure(ing.raw ?? ing.name ?? "", ing.quantity, ing.unit);
  if (!special) {
    return { quantity: ing.quantity, quantityMax: ing.quantityMax, unit: ing.unit, gpc };
  }
  const mult = special.quantity / ing.quantity;
  return {
    quantity: special.quantity,
    quantityMax: ing.quantityMax != null ? ing.quantityMax * mult : null,
    unit: special.unit,
    gpc: special.gramsPerCupOverride ?? gpc,
  };
}

/** Guess whether a recipe is written in weight or volume, for the default mode. */
function detectMode(ingredients: Ingredient[]): UnitMode {
  let volume = 0;
  let weight = 0;
  for (const ing of ingredients) {
    const { unit } = effectiveMeasure(ing);
    if (!unit) continue;
    if (unitKind(unit) === "weight") weight++;
    else if (unitKind(unit) === "volume") volume++;
  }
  return weight > volume ? "grams" : "volume";
}

export function RecipeView({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const nativeMode = useMemo(() => detectMode(recipe.ingredients), [recipe.ingredients]);
  const [factor, setFactor] = useState(1);
  const [scaleText, setScaleText] = useState("1");
  const [unitMode, setUnitMode] = useState<UnitMode>(nativeMode);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canEdit = recipe.role !== "viewer";

  function applyPreset(p: number) {
    setFactor(p);
    setScaleText(formatQuantity(p));
  }
  function onScaleTextChange(text: string) {
    setScaleText(text);
    const v = parseFloat(text);
    if (Number.isFinite(v) && v > 0) setFactor(v);
  }

  const scaledServings =
    recipe.servings != null ? Math.round(recipe.servings * factor) : null;

  const scaleNote =
    [
      factor !== 1 ? `Scaled ${formatQuantity(factor)}×` : null,
      unitMode !== nativeMode ? (unitMode === "grams" ? "in grams" : "in volume") : null,
    ]
      .filter(Boolean)
      .join(" · ") || null;

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
      <div className="mb-4 flex items-center justify-between text-sm no-print">
        <Link href={`/books/${recipe.book.id}`} className="text-muted hover:text-ink">
          ← {recipe.book.name}
        </Link>
        {canEdit && (
          <div className="flex items-center gap-4">
            <Link href={`/recipes/${recipe.id}/edit`} className="text-accent hover:underline">
              Edit
            </Link>
            <button
              onClick={() => {
                setDeleteError(null);
                setConfirmOpen(true);
              }}
              className="text-hot hover:underline"
            >
              Delete
            </button>
          </div>
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
          className="mb-5 aspect-[16/9] w-full rounded-2xl border border-line object-cover no-print"
        />
      )}

      <h1 className="font-title text-4xl leading-tight">{recipe.title}</h1>
      {scaleNote && (
        <p className="mt-1 hidden text-sm text-muted print:block">{scaleNote}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-line-strong pb-4 text-sm text-muted">
        {recipe.prepTime && <span><b className="text-ink">Prep</b> {recipe.prepTime}</span>}
        {recipe.cookTime && <span><b className="text-ink">Cook</b> {recipe.cookTime}</span>}
        {recipe.totalTime && <span><b className="text-ink">Total</b> {recipe.totalTime}</span>}
        {scaledServings != null && (
          <span><b className="text-ink">Serves</b> ~{scaledServings}</span>
        )}
        {recipe.servingsText && recipe.servings == null && (
          <span><b className="text-ink">Makes</b> {recipe.servingsText}</span>
        )}
        {recipe.sourceUrl && (
          <span className="ml-auto">
            {recipe.modified && <span className="italic text-muted">*modified from </span>}
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {recipe.modified ? "original ↗" : "Source ↗"}
            </a>
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-3 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-caps w-12">Scale</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
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
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-sm">
            <span className="text-muted">Custom ×</span>
            <input
              type="number"
              step="0.25"
              min="0.1"
              value={scaleText}
              onChange={(e) => onScaleTextChange(e.target.value)}
              aria-label="Custom scale factor"
              className="w-16 bg-transparent tnum outline-none"
            />
          </label>
          {scaledServings != null && (
            <span className="text-sm text-muted">Serves ~{scaledServings}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="label-caps w-12">Units</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            {UNIT_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setUnitMode(m.value)}
                aria-pressed={unitMode === m.value}
                className={`border-r border-line px-3 py-1.5 text-sm font-medium last:border-r-0 ${
                  unitMode === m.value
                    ? "bg-accent text-accent-fg"
                    : "bg-surface hover:bg-surface-2"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr] print:block">
        {/* Ingredients */}
        <section className="print:mb-6" style={{ breakInside: "avoid" }}>
          <h2 className="label-caps mb-3">Ingredients</h2>
          <ul className="flex flex-col">
            {recipe.ingredients.map((ing) => (
              <IngredientRow key={ing.id} ing={ing} factor={factor} unitMode={unitMode} />
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
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline no-print">
                  View the original ↗
                </a>
              )}
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3" style={{ breakInside: "avoid" }}>
                  <span className="font-title text-lg font-semibold text-hot tnum">{i + 1}.</span>
                  <p className="font-serif text-[15px] leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {recipe.notes && (
        <section className="mt-8 border-t-2 border-line-strong pt-4" style={{ breakInside: "avoid" }}>
          <h2 className="label-caps mb-3">Notes</h2>
          <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed">
            {recipe.notes}
          </p>
        </section>
      )}
    </main>
  );
}

function IngredientRow({
  ing,
  factor,
  unitMode,
}: {
  ing: Ingredient;
  factor: number;
  unitMode: UnitMode;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const display = useMemo(
    () => renderAmount(ing, factor, unitMode),
    [ing, factor, unitMode],
  );

  const eff = effectiveMeasure(ing);
  const kind = eff.unit ? unitKind(eff.unit) : null;
  const showSetWeight =
    eff.quantity != null &&
    eff.gpc == null &&
    ((unitMode === "grams" && kind === "volume") ||
      (unitMode === "volume" && kind === "weight"));

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
              className="ml-2 text-xs text-accent hover:underline no-print"
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
  unitMode: UnitMode,
): { amount: string | null } {
  const eff = effectiveMeasure(ing);
  if (eff.quantity == null) return { amount: null };

  const scaled = eff.quantity * factor;
  const scaledMax = eff.quantityMax != null ? eff.quantityMax * factor : null;
  const { unit, gpc } = eff;
  const kind = unit ? unitKind(unit) : null;

  if (unitMode === "grams") {
    const g = computeGrams(scaled, unit, gpc);
    if (g != null) {
      const gMax = scaledMax != null ? computeGrams(scaledMax, unit, gpc) : null;
      return {
        amount:
          gMax != null ? `${roundGrams(g)}–${roundGrams(gMax)} g` : `${roundGrams(g)} g`,
      };
    }
    // not convertible — fall through to as-written
  } else if (unitMode === "volume" && kind === "weight") {
    // Only weight ingredients are converted to volume; existing volumes stay in
    // their (more readable) written units.
    const c = computeCups(scaled, unit, gpc);
    if (c != null) {
      const cMax = scaledMax != null ? computeCups(scaledMax, unit, gpc) : null;
      const label = unitLabel("cup", c);
      return {
        amount:
          cMax != null
            ? `${formatQuantity(c)}–${formatQuantity(cMax)} ${label}`
            : `${formatQuantity(c)} ${label}`,
      };
    }
    // not convertible — fall through to as-written
  }

  const amtStr =
    formatQuantity(scaled) + (scaledMax != null ? `–${formatQuantity(scaledMax)}` : "");
  const lbl = unit ? " " + unitLabel(unit, scaled) : "";
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
    <form onSubmit={submit} className="mt-1.5 flex flex-wrap items-center gap-1.5 no-print">
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
