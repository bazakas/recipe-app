// Unicode fraction glyphs -> ascii "n/d".
const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅐": "1/7",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
  "⅑": "1/9",
  "⅒": "1/10",
};

// Common cooking fractions (value -> glyph) used to render amounts.
const COMMON_FRACTIONS: Array<[number, string]> = [
  [0, ""],
  [1 / 8, "⅛"],
  [1 / 6, "⅙"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [5 / 6, "⅚"],
  [7 / 8, "⅞"],
  [1, ""],
];

/**
 * Replace unicode fraction glyphs with ascii, inserting a space when a glyph
 * follows a digit ("1½" -> "1 1/2") so mixed numbers parse cleanly.
 */
export function normalizeFractionGlyphs(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const ascii = UNICODE_FRACTIONS[ch];
    if (ascii) {
      if (out.length && /\d$/.test(out)) out += " ";
      out += ascii;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Parse "1", "1/2", "1 1/2", "1.5" into a number, or null. */
export function parseNumericAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

/**
 * Format a numeric amount as a cook-friendly string: whole numbers stay whole,
 * amounts near a common cooking fraction render as glyphs (¾, 1 ½), and
 * anything else falls back to a trimmed decimal.
 */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (value === 0) return "0";

  const negative = value < 0;
  const abs = Math.abs(value);
  let whole = Math.floor(abs);
  const frac = abs - whole;

  // Find the closest common fraction to the fractional part.
  let best: [number, string] = [0, ""];
  let bestErr = Infinity;
  for (const cand of COMMON_FRACTIONS) {
    const err = Math.abs(frac - cand[0]);
    if (err < bestErr) {
      bestErr = err;
      best = cand;
    }
  }

  const TOLERANCE = 0.045;
  let out: string;
  if (bestErr <= TOLERANCE) {
    let [val, glyph] = best;
    if (val === 1) {
      whole += 1; // e.g. 1.99 -> 2
      glyph = "";
    }
    if (glyph === "") out = String(whole);
    else if (whole === 0) out = glyph;
    else out = `${whole} ${glyph}`;
  } else {
    out = String(Math.round(abs * 100) / 100);
  }

  return negative ? `-${out}` : out;
}
