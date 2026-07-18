import { toCups, toGrams, unitKind, type CanonicalUnit } from "@/lib/units";

/**
 * Gram conversion + ingredient-name matching against the weight chart.
 * Pure functions so they can run on the server (with DB data) or the client
 * (with a preloaded chart).
 */

export type WeightSource = {
  name: string;
  gramsPerCup: number | null;
};

// Descriptor words to drop when matching an ingredient name to the chart.
const DESCRIPTORS = new Set([
  "fresh",
  "large",
  "small",
  "medium",
  "packed",
  "sifted",
  "chopped",
  "minced",
  "diced",
  "sliced",
  "ground",
  "melted",
  "softened",
  "cold",
  "warm",
  "room",
  "temperature",
  "finely",
  "freshly",
  "roughly",
  "thinly",
  "lightly",
  "unsalted",
  "salted",
  "granulated",
  "fine",
  "coarse",
  "whole",
  "raw",
  "cooked",
  "dried",
  "toasted",
  "shredded",
  "grated",
  "beaten",
  "divided",
  "plus",
  "more",
  "optional",
  "to",
  "taste",
  "for",
  "of",
  "the",
  "a",
  "an",
]);

/** Lowercase, strip parentheticals/punctuation, drop descriptor words. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // remove parentheticals
    .replace(/[^a-z\s-]/g, " ") // drop digits/punctuation
    .split(/\s+/)
    .filter((w) => w && !DESCRIPTORS.has(w))
    .join(" ")
    .trim();
}

function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

export type WeightMatch = {
  source: WeightSource;
  score: number; // 0..1 confidence
};

/**
 * Build a reusable matcher over a chart. Returns the best matching chart entry
 * for an ingredient name, or null if nothing clears the confidence threshold.
 */
export function buildWeightMatcher(sources: WeightSource[]) {
  const prepared = sources
    .filter((s) => s.gramsPerCup != null)
    .map((s) => ({
      source: s,
      norm: normalizeName(s.name),
      toks: new Set(tokens(normalizeName(s.name))),
    }));

  return function match(rawName: string): WeightMatch | null {
    const norm = normalizeName(rawName);
    if (!norm) return null;
    const ingToks = new Set(tokens(norm));

    let best: WeightMatch | null = null;
    for (const p of prepared) {
      if (!p.norm) continue;
      let score = 0;
      if (p.norm === norm) {
        score = 1;
      } else if (norm.includes(p.norm) || p.norm.includes(norm)) {
        // One name contains the other (e.g. "flour" in "bread flour").
        score = 0.85;
      } else {
        // Token overlap (Jaccard).
        let inter = 0;
        for (const t of ingToks) if (p.toks.has(t)) inter++;
        const union = new Set([...ingToks, ...p.toks]).size;
        score = union ? inter / union : 0;
      }
      if (!best || score > best.score) best = { source: p.source, score };
    }

    // Require reasonable confidence to avoid nonsense matches.
    if (!best || best.score < 0.5) return null;
    return best;
  };
}

/**
 * Convert an ingredient amount to grams.
 * - weight units convert directly (oz, lb, kg -> g)
 * - volume units need a grams-per-cup value from the chart / custom weight
 * Returns null when conversion isn't possible.
 */
export function computeGrams(
  quantity: number | null,
  unit: CanonicalUnit | null,
  gramsPerCup: number | null,
): number | null {
  if (quantity == null || unit == null) return null;

  if (unitKind(unit) === "weight") {
    return toGrams(quantity, unit);
  }
  if (unitKind(unit) === "volume") {
    const cups = toCups(quantity, unit);
    if (cups == null || gramsPerCup == null) return null;
    return cups * gramsPerCup;
  }
  return null;
}

/** Round grams for display (nearest gram, or 1 decimal under 10g). */
export function roundGrams(grams: number): number {
  return grams < 10 ? Math.round(grams * 10) / 10 : Math.round(grams);
}
