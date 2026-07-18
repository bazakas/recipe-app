import { describe, it, expect } from "vitest";
import {
  normalizeName,
  buildWeightMatcher,
  computeGrams,
  roundGrams,
  type WeightSource,
} from "@/lib/convert";

describe("normalizeName", () => {
  it("lowercases, strips parentheticals and descriptors", () => {
    expect(normalizeName("Sugar (granulated white)")).toBe("sugar");
    expect(normalizeName("finely grated Parmesan cheese")).toBe("parmesan cheese");
    expect(normalizeName("chopped walnuts")).toBe("walnuts");
  });
});

const CHART: WeightSource[] = [
  { name: "All-Purpose Flour", gramsPerCup: 120 },
  { name: "Sugar (granulated white)", gramsPerCup: 198 },
  { name: "Butter", gramsPerCup: 226 },
  { name: "Chocolate Chips", gramsPerCup: 170 },
  { name: "Honey", gramsPerCup: 336 },
  { name: "No Weight Ingredient", gramsPerCup: null },
];

describe("buildWeightMatcher", () => {
  const match = buildWeightMatcher(CHART);

  it("matches exact normalized names", () => {
    expect(match("granulated sugar")?.source.name).toBe("Sugar (granulated white)");
  });
  it("matches by containment", () => {
    expect(match("all-purpose flour")?.source.name).toBe("All-Purpose Flour");
  });
  it("returns null when nothing clears the confidence threshold", () => {
    expect(match("xyz nonexistent ingredient")).toBeNull();
  });
  it("ignores chart rows without a grams-per-cup value", () => {
    expect(match("no weight ingredient")).toBeNull();
  });
});

describe("computeGrams", () => {
  it("converts volume to grams via grams-per-cup", () => {
    expect(computeGrams(1, "cup", 120)).toBeCloseTo(120, 6); // flour
    expect(computeGrams(0.5, "cup", 226)).toBeCloseTo(113, 6); // butter
    expect(computeGrams(2, "tablespoon", 226)).toBeCloseTo(28.25, 2);
  });
  it("converts weight units directly (ignores grams-per-cup)", () => {
    expect(computeGrams(4, "ounce", null)).toBeCloseTo(113.4, 1);
    expect(computeGrams(1, "pound", null)).toBeCloseTo(453.592, 2);
  });
  it("returns null when quantity, unit, or grams-per-cup is missing", () => {
    expect(computeGrams(null, "cup", 120)).toBeNull();
    expect(computeGrams(1, null, 120)).toBeNull();
    expect(computeGrams(1, "cup", null)).toBeNull();
  });
});

describe("roundGrams", () => {
  it("rounds to whole grams at 10g and above", () => {
    expect(roundGrams(113.4)).toBe(113);
    expect(roundGrams(197.6)).toBe(198);
  });
  it("keeps one decimal below 10g", () => {
    expect(roundGrams(9.42)).toBe(9.4);
    expect(roundGrams(5.01)).toBe(5);
  });
});
