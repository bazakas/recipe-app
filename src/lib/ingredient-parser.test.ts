import { describe, it, expect } from "vitest";
import { parseIngredient } from "@/lib/ingredient-parser";

describe("parseIngredient", () => {
  it("parses quantity, unit, and name", () => {
    const p = parseIngredient("1 1/2 cups all-purpose flour");
    expect(p).toMatchObject({
      quantity: 1.5,
      quantityMax: null,
      unit: "cup",
      name: "all-purpose flour",
    });
  });

  it("parses ranges (2 to 3, 1-2)", () => {
    expect(parseIngredient("2 to 3 tablespoons olive oil")).toMatchObject({
      quantity: 2,
      quantityMax: 3,
      unit: "tablespoon",
      name: "olive oil",
    });
    expect(parseIngredient("1-2 cloves garlic, minced")).toMatchObject({
      quantity: 1,
      quantityMax: 2,
      note: "minced",
    });
  });

  it("parses a leading unicode fraction", () => {
    expect(parseIngredient("½ tsp baking soda")).toMatchObject({
      quantity: 0.5,
      unit: "teaspoon",
      name: "baking soda",
    });
  });

  it("parses a mixed unicode number", () => {
    expect(parseIngredient("1½ cups sugar")).toMatchObject({
      quantity: 1.5,
      unit: "cup",
      name: "sugar",
    });
  });

  it("splits a trailing note on the first comma", () => {
    expect(parseIngredient("1 large egg, beaten")).toMatchObject({
      quantity: 1,
      unit: null,
      name: "large egg",
      note: "beaten",
    });
  });

  it("strips a leading measurement parenthetical", () => {
    expect(parseIngredient("4 ounces (115 grams) dried pasta")).toMatchObject({
      quantity: 4,
      unit: "ounce",
      name: "dried pasta",
    });
  });

  it("accepts single-letter t/T shorthand case-sensitively", () => {
    expect(parseIngredient("1 t vanilla")).toMatchObject({
      quantity: 1,
      unit: "teaspoon",
      name: "vanilla",
    });
    expect(parseIngredient("2 T olive oil")).toMatchObject({
      quantity: 2,
      unit: "tablespoon",
      name: "olive oil",
    });
    // Words starting with t must not be mistaken for the unit.
    expect(parseIngredient("2 tomatoes, diced")).toMatchObject({
      quantity: 2,
      unit: null,
      name: "tomatoes",
    });
  });

  it("handles weight units", () => {
    expect(parseIngredient("3 lbs boneless chicken thighs")).toMatchObject({
      quantity: 3,
      unit: "pound",
      name: "boneless chicken thighs",
    });
  });

  it("leaves unquantified ingredients as name-only", () => {
    expect(parseIngredient("Salt and pepper to taste")).toMatchObject({
      quantity: null,
      unit: null,
      name: "Salt and pepper to taste",
    });
  });

  it("always preserves the raw text", () => {
    const raw = "1/4 cup packed brown sugar";
    expect(parseIngredient(raw).raw).toBe(raw);
  });
});
