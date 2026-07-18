import { describe, it, expect } from "vitest";
import {
  normalizeUnit,
  unitKind,
  toCups,
  toGrams,
  unitLabel,
} from "@/lib/units";

describe("normalizeUnit", () => {
  it("maps spellings and abbreviations to canonical units", () => {
    expect(normalizeUnit("cups")).toBe("cup");
    expect(normalizeUnit("Tbsp")).toBe("tablespoon");
    expect(normalizeUnit("tsp")).toBe("teaspoon");
    expect(normalizeUnit("g")).toBe("gram");
    expect(normalizeUnit("lbs")).toBe("pound");
    expect(normalizeUnit("oz")).toBe("ounce");
  });
  it("ignores a trailing period", () => {
    expect(normalizeUnit("tbsp.")).toBe("tablespoon");
  });
  it("treats single-letter t/T case-sensitively", () => {
    expect(normalizeUnit("t")).toBe("teaspoon");
    expect(normalizeUnit("T")).toBe("tablespoon");
    expect(normalizeUnit("t.")).toBe("teaspoon");
    expect(normalizeUnit("T.")).toBe("tablespoon");
  });
  it("returns null for unknown units", () => {
    expect(normalizeUnit("clove")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
  });
});

describe("unitKind", () => {
  it("classifies volume and weight", () => {
    expect(unitKind("cup")).toBe("volume");
    expect(unitKind("tablespoon")).toBe("volume");
    expect(unitKind("gram")).toBe("weight");
    expect(unitKind("pound")).toBe("weight");
  });
});

describe("toCups", () => {
  it("converts volume units to cups", () => {
    expect(toCups(1, "cup")).toBe(1);
    expect(toCups(16, "tablespoon")).toBeCloseTo(1, 10);
    expect(toCups(48, "teaspoon")).toBeCloseTo(1, 10);
    expect(toCups(1, "pint")).toBe(2);
  });
  it("returns null for weight units", () => {
    expect(toCups(1, "gram")).toBeNull();
  });
});

describe("toGrams", () => {
  it("converts weight units to grams", () => {
    expect(toGrams(1, "gram")).toBe(1);
    expect(toGrams(1, "kilogram")).toBe(1000);
    expect(toGrams(1, "ounce")).toBeCloseTo(28.3495, 3);
    expect(toGrams(1, "pound")).toBeCloseTo(453.592, 2);
  });
  it("returns null for volume units", () => {
    expect(toGrams(1, "cup")).toBeNull();
  });
});

describe("unitLabel", () => {
  it("is singular for one or less, plural above one", () => {
    expect(unitLabel("cup", 1)).toBe("cup");
    expect(unitLabel("cup", 0.5)).toBe("cup");
    expect(unitLabel("cup", 2)).toBe("cups");
    expect(unitLabel("teaspoon", 3)).toBe("teaspoons");
  });
});
