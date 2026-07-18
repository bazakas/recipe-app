/**
 * Unit normalization and volume math shared by the ingredient parser and the
 * gram-conversion logic.
 */

export type UnitKind = "volume" | "weight" | "count";

export type CanonicalUnit =
  // volume
  | "cup"
  | "tablespoon"
  | "teaspoon"
  | "fluid-ounce"
  | "pint"
  | "quart"
  | "gallon"
  | "milliliter"
  | "liter"
  // weight
  | "gram"
  | "kilogram"
  | "ounce"
  | "pound";

// Maps many spellings/abbreviations to a canonical unit.
const UNIT_SYNONYMS: Record<string, CanonicalUnit> = {
  // cup
  cup: "cup",
  cups: "cup",
  c: "cup",
  // tablespoon
  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  tbsp: "tablespoon",
  tbsps: "tablespoon",
  tbs: "tablespoon",
  tb: "tablespoon",
  // teaspoon
  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
  tsp: "teaspoon",
  tsps: "teaspoon",
  // Single-letter "t" is a token so the parser recognizes it; case (t vs T) is
  // resolved in normalizeUnit — lowercase t = teaspoon, uppercase T = tablespoon.
  t: "teaspoon",
  // fluid ounce
  "fluid ounce": "fluid-ounce",
  "fluid ounces": "fluid-ounce",
  "fl oz": "fluid-ounce",
  floz: "fluid-ounce",
  // pint / quart / gallon
  pint: "pint",
  pints: "pint",
  pt: "pint",
  quart: "quart",
  quarts: "quart",
  qt: "quart",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  // metric volume
  milliliter: "milliliter",
  milliliters: "milliliter",
  millilitre: "milliliter",
  ml: "milliliter",
  liter: "liter",
  liters: "liter",
  litre: "liter",
  l: "liter",
  // weight
  gram: "gram",
  grams: "gram",
  g: "gram",
  gr: "gram",
  kilogram: "kilogram",
  kilograms: "kilogram",
  kg: "kilogram",
  ounce: "ounce",
  ounces: "ounce",
  oz: "ounce",
  pound: "pound",
  pounds: "pound",
  lb: "pound",
  lbs: "pound",
};

const UNIT_KIND: Record<CanonicalUnit, UnitKind> = {
  cup: "volume",
  tablespoon: "volume",
  teaspoon: "volume",
  "fluid-ounce": "volume",
  pint: "volume",
  quart: "volume",
  gallon: "volume",
  milliliter: "volume",
  liter: "volume",
  gram: "weight",
  kilogram: "weight",
  ounce: "weight",
  pound: "weight",
};

// Volume units expressed in US cups (for grams-per-cup conversion).
const VOLUME_IN_CUPS: Partial<Record<CanonicalUnit, number>> = {
  cup: 1,
  tablespoon: 1 / 16,
  teaspoon: 1 / 48,
  "fluid-ounce": 1 / 8,
  pint: 2,
  quart: 4,
  gallon: 16,
  milliliter: 1 / 236.588,
  liter: 1000 / 236.588,
};

/** All unit spellings, longest first, for greedy matching in the parser. */
export const UNIT_TOKENS: string[] = Object.keys(UNIT_SYNONYMS).sort(
  (a, b) => b.length - a.length,
);

export function normalizeUnit(raw: string): CanonicalUnit | null {
  const trimmed = raw.trim().replace(/\.$/, "");
  // Case-sensitive cooking shorthand: t = teaspoon, T = tablespoon.
  if (trimmed === "t") return "teaspoon";
  if (trimmed === "T") return "tablespoon";
  return UNIT_SYNONYMS[trimmed.toLowerCase()] ?? null;
}

export function unitKind(unit: CanonicalUnit): UnitKind {
  return UNIT_KIND[unit];
}

/** Convert a volume amount to US cups, or null if the unit isn't a volume. */
export function toCups(amount: number, unit: CanonicalUnit): number | null {
  const factor = VOLUME_IN_CUPS[unit];
  return factor == null ? null : amount * factor;
}

/** Convert a weight amount to grams, or null if the unit isn't a weight. */
export function toGrams(amount: number, unit: CanonicalUnit): number | null {
  switch (unit) {
    case "gram":
      return amount;
    case "kilogram":
      return amount * 1000;
    case "ounce":
      return amount * 28.3495;
    case "pound":
      return amount * 453.592;
    default:
      return null;
  }
}

/** Human-friendly unit label for a given amount (handles pluralization). */
export function unitLabel(unit: CanonicalUnit, amount: number): string {
  // Singular for one or less (e.g. "½ cup", "1 cup"); plural above one.
  const plural = amount > 1;
  const labels: Record<CanonicalUnit, [string, string]> = {
    cup: ["cup", "cups"],
    tablespoon: ["tablespoon", "tablespoons"],
    teaspoon: ["teaspoon", "teaspoons"],
    "fluid-ounce": ["fl oz", "fl oz"],
    pint: ["pint", "pints"],
    quart: ["quart", "quarts"],
    gallon: ["gallon", "gallons"],
    milliliter: ["ml", "ml"],
    liter: ["liter", "liters"],
    gram: ["g", "g"],
    kilogram: ["kg", "kg"],
    ounce: ["oz", "oz"],
    pound: ["lb", "lbs"],
  };
  return plural ? labels[unit][1] : labels[unit][0];
}
