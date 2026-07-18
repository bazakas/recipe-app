import { normalizeFractionGlyphs, parseNumericAmount } from "@/lib/quantity";
import { normalizeUnit, UNIT_TOKENS, type CanonicalUnit } from "@/lib/units";

export type ParsedIngredient = {
  raw: string;
  quantity: number | null;
  quantityMax: number | null; // upper bound for ranges like "1-2"
  unit: CanonicalUnit | null;
  name: string | null;
  note: string | null;
};

// A number token: "1 1/2" (mixed), "1/2" (fraction), or "1"/"1.5" (decimal).
// Ordered so the mixed and fraction forms match before the bare integer.
const NUMBER = "\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?";
// Range separators: "-", "–", "to".
const RANGE = "\\s*(?:-|–|—|to)\\s*";

const LEADING_QTY_RE = new RegExp(
  `^\\s*(${NUMBER})(?:${RANGE}(${NUMBER}))?\\s*`,
);

// Longest-first alternation of all known unit spellings.
const UNIT_ALT = UNIT_TOKENS.map((u) => u.replace(/[.]/g, "\\.")).join("|");
const LEADING_UNIT_RE = new RegExp(`^(${UNIT_ALT})\\b\\.?\\s*`, "i");

/**
 * Best-effort parse of a single ingredient line into structured parts. The raw
 * text is always preserved; structured fields are null when they can't be
 * confidently extracted.
 *
 * Examples:
 *   "1 1/2 cups all-purpose flour"      -> 1.5 cup / all-purpose flour
 *   "2 to 3 tablespoons olive oil"      -> 2..3 tablespoon / olive oil
 *   "1 large egg, beaten"               -> 1 / large egg (note: beaten)
 *   "Salt and pepper to taste"          -> null qty / salt and pepper to taste
 */
export function parseIngredient(rawInput: string): ParsedIngredient {
  const raw = rawInput.trim();
  const result: ParsedIngredient = {
    raw,
    quantity: null,
    quantityMax: null,
    unit: null,
    name: null,
    note: null,
  };
  if (!raw) return result;

  let rest = normalizeFractionGlyphs(raw);

  // 1) Leading quantity (and optional range upper bound).
  const qtyMatch = rest.match(LEADING_QTY_RE);
  if (qtyMatch) {
    result.quantity = parseNumericAmount(qtyMatch[1]);
    if (qtyMatch[2]) result.quantityMax = parseNumericAmount(qtyMatch[2]);
    rest = rest.slice(qtyMatch[0].length);
  }

  // 2) Unit immediately after the quantity.
  if (result.quantity != null) {
    const unitMatch = rest.match(LEADING_UNIT_RE);
    if (unitMatch) {
      const canonical = normalizeUnit(unitMatch[1]);
      if (canonical) {
        result.unit = canonical;
        rest = rest.slice(unitMatch[0].length);
      }
    }
  }

  // 3) Remainder is the name; split a trailing note on the first comma.
  rest = rest.replace(/^(?:of\s+)/i, "").trim();
  // Drop a leading parenthetical, usually an alternate measure right after the
  // amount, e.g. "(115 grams) dried pasta" -> "dried pasta".
  if (result.quantity != null) {
    rest = rest.replace(/^\([^)]*\)\s*/, "").trim();
  }
  const commaIdx = rest.indexOf(",");
  if (commaIdx >= 0) {
    result.name = rest.slice(0, commaIdx).trim() || null;
    result.note = rest.slice(commaIdx + 1).trim() || null;
  } else {
    result.name = rest || null;
  }

  return result;
}
