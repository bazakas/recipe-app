import type { CanonicalUnit } from "@/lib/units";

/**
 * Some ingredients are written in non-standard measures the parser can't map to
 * a unit (a "packet" of yeast, a "stick" of butter). This resolves those into a
 * standard unit + amount, with a grams-per-cup override when the King Arthur
 * chart can't be relied on (e.g. yeast rarely matches cleanly).
 *
 * Returns the amount already expressed in `unit` for the recipe's stated count
 * (before recipe scaling), or null if nothing special applies.
 */
export type SpecialResolution = {
  quantity: number;
  unit: CanonicalUnit;
  gramsPerCupOverride?: number;
};

// A standard yeast packet is 2 1/4 tsp ≈ 7 g. That works out to ~149 g/cup for
// active-dry / instant yeast.
const YEAST_G_PER_CUP = 149.3;

export function resolveSpecialMeasure(
  text: string,
  quantity: number,
  unit: CanonicalUnit | null,
): SpecialResolution | null {
  const t = text.toLowerCase();

  if (/\byeast\b/.test(t)) {
    // "1 packet / envelope / sachet" of yeast = 2 1/4 tsp each.
    const isPacket = /\b(packets?|envelopes?|sachets?|pkgs?|packages?)\b/.test(t);
    if (unit == null && isPacket) {
      return {
        quantity: quantity * 2.25,
        unit: "teaspoon",
        gramsPerCupOverride: YEAST_G_PER_CUP,
      };
    }
    // Yeast written in spoons: give it a reliable density so it converts.
    if (unit === "teaspoon" || unit === "tablespoon") {
      return { quantity, unit, gramsPerCupOverride: YEAST_G_PER_CUP };
    }
  }

  // "1 stick" of butter = 8 tablespoons (1/2 cup) = 113 g.
  if (/\bbutter\b/.test(t) && unit == null && /\bsticks?\b/.test(t)) {
    return { quantity: quantity * 8, unit: "tablespoon", gramsPerCupOverride: 226 };
  }

  return null;
}
