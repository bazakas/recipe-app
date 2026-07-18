import { describe, it, expect } from "vitest";
import {
  extractRecipeFromHtml,
  humanizeDuration,
  RecipeParseError,
} from "@/lib/recipe-parser";

describe("humanizeDuration", () => {
  it("formats hours and minutes", () => {
    expect(humanizeDuration("PT1H30M")).toBe("1 hr 30 min");
    expect(humanizeDuration("PT45M")).toBe("45 min");
  });
  it("skips zero components", () => {
    expect(humanizeDuration("P0DT0H15M0S")).toBe("15 min");
  });
  it("returns null for empty or malformed input", () => {
    expect(humanizeDuration(null)).toBeNull();
    expect(humanizeDuration("banana")).toBeNull();
  });
});

const JSONLD_HTML = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "name": "ignore me" },
    {
      "@type": "Recipe",
      "name": "Best Banana Bread",
      "description": "Moist and easy.",
      "image": ["https://example.com/banana.jpg"],
      "recipeYield": "8 slices",
      "prepTime": "PT15M",
      "cookTime": "PT55M",
      "totalTime": "PT1H10M",
      "recipeIngredient": ["2 cups flour", "1 cup sugar", "3 ripe bananas"],
      "recipeInstructions": [
        { "@type": "HowToStep", "text": "Mix the dry ingredients." },
        { "@type": "HowToStep", "text": "Fold in the bananas." }
      ]
    }
  ]
}
</script>
</head><body></body></html>
`;

describe("extractRecipeFromHtml — JSON-LD", () => {
  const r = extractRecipeFromHtml(JSONLD_HTML, "https://example.com/banana");

  it("extracts title, description, and image", () => {
    expect(r.title).toBe("Best Banana Bread");
    expect(r.description).toBe("Moist and easy.");
    expect(r.imageUrl).toBe("https://example.com/banana.jpg");
  });
  it("extracts yield and humanized times", () => {
    expect(r.servings).toBe(8);
    expect(r.servingsText).toBe("8 slices");
    expect(r.prepTime).toBe("15 min");
    expect(r.totalTime).toBe("1 hr 10 min");
  });
  it("extracts ingredients and instructions", () => {
    expect(r.ingredients).toEqual(["2 cups flour", "1 cup sugar", "3 ripe bananas"]);
    expect(r.instructions).toEqual([
      "Mix the dry ingredients.",
      "Fold in the bananas.",
    ]);
  });
});

// Mimics Smitten Kitchen / Jetpack Recipe markup: microdata, loose-text
// directions with a trailing footnote <p>, and ingredient parentheticals.
const MICROFORMAT_HTML = `
<html><head><meta property="og:image" content="https://example.com/mac.jpg"></head>
<body>
<div class="hrecipe h-recipe jetpack-recipe" itemscope itemtype="https://schema.org/Recipe">
  <h3 class="p-name jetpack-recipe-title fn" itemprop="name">Stovetop Mac-and-Cheese</h3>
  <ul class="jetpack-recipe-meta">
    <li class="jetpack-recipe-servings p-yield yield" itemprop="recipeYield"><strong>Servings: </strong>1</li>
    <li class="jetpack-recipe-time"><time itemprop="totalTime" datetime="P0DT0H15M0S"><strong>Time:</strong> <span class="time">15 minutes</span></time></li>
  </ul>
  <div class="jetpack-recipe-ingredients"><ul>
    <li class="jetpack-recipe-ingredient p-ingredient ingredient" itemprop="recipeIngredient">Kosher salt</li>
    <li class="jetpack-recipe-ingredient p-ingredient ingredient" itemprop="recipeIngredient">4 ounces (115 grams) dried pasta</li>
    <li class="jetpack-recipe-ingredient p-ingredient ingredient" itemprop="recipeIngredient">2 teaspoons (10 grams) butter</li>
  </ul></div>
  <div class="jetpack-recipe-directions e-instructions">Bring a pot of salted water to a boil and cook the pasta.<p>** A footnote that is not a step.</p></div>
</div>
</body></html>
`;

describe("extractRecipeFromHtml — microformat fallback", () => {
  const r = extractRecipeFromHtml(MICROFORMAT_HTML, "https://sk.example/mac");

  it("extracts the title", () => {
    expect(r.title).toBe("Stovetop Mac-and-Cheese");
  });
  it("strips the 'Servings:' label from the yield", () => {
    expect(r.servingsText).toBe("1");
    expect(r.servings).toBe(1);
  });
  it("reads the total time from the datetime attribute", () => {
    expect(r.totalTime).toBe("15 min");
  });
  it("extracts all ingredients", () => {
    expect(r.ingredients).toEqual([
      "Kosher salt",
      "4 ounces (115 grams) dried pasta",
      "2 teaspoons (10 grams) butter",
    ]);
  });
  it("uses the real direction text, not the footnote", () => {
    expect(r.instructions).toEqual([
      "Bring a pot of salted water to a boil and cook the pasta.",
    ]);
  });
  it("falls back to og:image for the image", () => {
    expect(r.imageUrl).toBe("https://example.com/mac.jpg");
  });
});

describe("extractRecipeFromHtml — no recipe", () => {
  it("throws a no_structured_data error", () => {
    try {
      extractRecipeFromHtml("<html><body><p>no recipe here</p></body></html>", "https://x.example");
      throw new Error("expected it to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RecipeParseError);
      expect((err as RecipeParseError).code).toBe("no_structured_data");
    }
  });
});
