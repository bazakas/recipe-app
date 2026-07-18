import { describe, it, expect } from "vitest";
import { resolveSpecialMeasure } from "@/lib/special-measures";
import { computeGrams } from "@/lib/convert";

describe("resolveSpecialMeasure", () => {
  it("treats a packet/envelope of yeast as 2.25 tsp (~7 g)", () => {
    const r = resolveSpecialMeasure("packet active dry yeast", 1, null);
    expect(r).not.toBeNull();
    expect(r!.unit).toBe("teaspoon");
    expect(r!.quantity).toBeCloseTo(2.25, 6);
    const grams = computeGrams(r!.quantity, r!.unit, r!.gramsPerCupOverride ?? null);
    expect(grams).toBeCloseTo(7, 0);
  });

  it("scales multiple yeast packets", () => {
    const r = resolveSpecialMeasure("2 envelopes instant yeast", 2, null);
    expect(r!.quantity).toBeCloseTo(4.5, 6);
    const grams = computeGrams(r!.quantity, r!.unit, r!.gramsPerCupOverride ?? null);
    expect(grams).toBeCloseTo(14, 0);
  });

  it("gives yeast measured in spoons a reliable density", () => {
    const r = resolveSpecialMeasure("active dry yeast", 2.25, "teaspoon");
    expect(r).not.toBeNull();
    const grams = computeGrams(r!.quantity, r!.unit, r!.gramsPerCupOverride ?? null);
    expect(grams).toBeCloseTo(7, 0);
  });

  it("treats a stick of butter as 8 tbsp (113 g)", () => {
    const r = resolveSpecialMeasure("stick butter", 1, null);
    expect(r!.unit).toBe("tablespoon");
    expect(r!.quantity).toBe(8);
    const grams = computeGrams(r!.quantity, r!.unit, r!.gramsPerCupOverride ?? null);
    expect(grams).toBeCloseTo(113, 0);
  });

  it("returns null for ordinary ingredients", () => {
    expect(resolveSpecialMeasure("all-purpose flour", 2, "cup")).toBeNull();
    expect(resolveSpecialMeasure("sugar", 1, "cup")).toBeNull();
  });
});
