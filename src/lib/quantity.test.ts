import { describe, it, expect } from "vitest";
import {
  normalizeFractionGlyphs,
  parseNumericAmount,
  formatQuantity,
} from "@/lib/quantity";

describe("normalizeFractionGlyphs", () => {
  it("converts standalone glyphs to ascii fractions", () => {
    expect(normalizeFractionGlyphs("½ tsp salt")).toBe("1/2 tsp salt");
  });
  it("inserts a space in mixed numbers (1½ -> 1 1/2)", () => {
    expect(normalizeFractionGlyphs("1½ cups sugar")).toBe("1 1/2 cups sugar");
  });
  it("leaves plain text unchanged", () => {
    expect(normalizeFractionGlyphs("2 cups flour")).toBe("2 cups flour");
  });
});

describe("parseNumericAmount", () => {
  it("parses integers and decimals", () => {
    expect(parseNumericAmount("3")).toBe(3);
    expect(parseNumericAmount("1.5")).toBe(1.5);
  });
  it("parses simple fractions", () => {
    expect(parseNumericAmount("1/2")).toBe(0.5);
    expect(parseNumericAmount("3/4")).toBe(0.75);
  });
  it("parses mixed numbers", () => {
    expect(parseNumericAmount("1 1/2")).toBe(1.5);
  });
  it("returns null for non-numeric input", () => {
    expect(parseNumericAmount("")).toBeNull();
    expect(parseNumericAmount("salt")).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("keeps whole numbers whole", () => {
    expect(formatQuantity(1)).toBe("1");
    expect(formatQuantity(3)).toBe("3");
  });
  it("renders common fractions as glyphs", () => {
    expect(formatQuantity(0.5)).toBe("½");
    expect(formatQuantity(0.75)).toBe("¾");
    expect(formatQuantity(0.25)).toBe("¼");
    expect(formatQuantity(0.125)).toBe("⅛");
  });
  it("approximates thirds", () => {
    expect(formatQuantity(1 / 3)).toBe("⅓");
    expect(formatQuantity(2 / 3)).toBe("⅔");
  });
  it("renders mixed numbers", () => {
    expect(formatQuantity(1.5)).toBe("1 ½");
    expect(formatQuantity(2.5)).toBe("2 ½");
  });
  it("falls back to a trimmed decimal for uncommon values", () => {
    expect(formatQuantity(0.05)).toBe("0.05");
  });
  it("handles zero", () => {
    expect(formatQuantity(0)).toBe("0");
  });
});
