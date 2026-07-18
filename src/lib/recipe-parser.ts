import * as cheerio from "cheerio";

export type ScrapedRecipe = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  servings: number | null;
  servingsText: string | null;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  ingredients: string[];
  instructions: string[];
};

export class RecipeParseError extends Error {
  constructor(
    message: string,
    readonly code:
      | "fetch_failed"
      | "no_structured_data"
      | "not_a_recipe" = "no_structured_data",
  ) {
    super(message);
    this.name = "RecipeParseError";
  }
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

/** Fetch a URL and extract the first schema.org/Recipe into a normalized shape. */
export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new RecipeParseError(
        `The site returned HTTP ${res.status}.`,
        "fetch_failed",
      );
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof RecipeParseError) throw err;
    throw new RecipeParseError(
      "Couldn't reach that URL. Check the link and try again.",
      "fetch_failed",
    );
  }

  return extractRecipeFromHtml(html, url);
}

/**
 * Extract a recipe from page HTML (no network). Separated from scrapeRecipe so
 * it can be unit-tested against fixtures. Tries JSON-LD, then the microformat
 * fallback, then throws.
 */
export function extractRecipeFromHtml(html: string, url: string): ScrapedRecipe {
  const $ = cheerio.load(html);

  // Preferred: schema.org/Recipe in JSON-LD.
  const recipeNode = findRecipeNode($);
  if (recipeNode) return normalizeRecipe(recipeNode, url, $);

  // Fallback: hRecipe / Jetpack / schema.org microdata (Smitten Kitchen, many
  // WordPress food blogs).
  const microformat = parseMicroformatRecipe($, url);
  if (microformat) return microformat;

  throw new RecipeParseError(
    "This page doesn't have a recipe we can read automatically. You can add it manually.",
    "no_structured_data",
  );
}

type JsonObject = Record<string, unknown>;

/** Scan all ld+json blocks (incl. @graph / arrays) for a Recipe object. */
function findRecipeNode($: cheerio.CheerioAPI): JsonObject | null {
  const blocks = $('script[type="application/ld+json"]')
    .toArray()
    .map((el) => $(el).text())
    .filter(Boolean);

  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block);
    } catch {
      continue; // skip malformed JSON-LD
    }
    const found = searchForRecipe(data);
    if (found) return found;
  }
  return null;
}

function hasType(node: JsonObject, type: string): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t.toLowerCase() === type.toLowerCase();
  if (Array.isArray(t))
    return t.some(
      (x) => typeof x === "string" && x.toLowerCase() === type.toLowerCase(),
    );
  return false;
}

function searchForRecipe(data: unknown): JsonObject | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = searchForRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (data && typeof data === "object") {
    const obj = data as JsonObject;
    if (hasType(obj, "Recipe")) return obj;
    if (Array.isArray(obj["@graph"])) {
      const found = searchForRecipe(obj["@graph"]);
      if (found) return found;
    }
  }
  return null;
}

function normalizeRecipe(
  node: JsonObject,
  sourceUrl: string,
  $?: cheerio.CheerioAPI,
): ScrapedRecipe {
  const title = firstString(node["name"]) ?? "Untitled recipe";
  const description = firstString(node["description"]);

  return {
    title,
    description,
    imageUrl: extractImage(node["image"]) ?? ($ ? ogImage($) : null),
    sourceUrl,
    servings: extractServingsNumber(node["recipeYield"]),
    servingsText: extractServingsText(node["recipeYield"]),
    prepTime: humanizeDuration(firstString(node["prepTime"])),
    cookTime: humanizeDuration(firstString(node["cookTime"])),
    totalTime: humanizeDuration(firstString(node["totalTime"])),
    ingredients: extractIngredients(node),
    instructions: extractInstructions(node["recipeInstructions"]),
  };
}

function firstString(v: unknown): string | null {
  if (typeof v === "string") return decodeEntities(v.trim()) || null;
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = firstString(item);
      if (s) return s;
    }
  }
  if (v && typeof v === "object") {
    const obj = v as JsonObject;
    if (typeof obj["@value"] === "string") return firstString(obj["@value"]);
  }
  return null;
}

function extractImage(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return extractImage(v[0]);
  if (typeof v === "object") {
    const obj = v as JsonObject;
    if (typeof obj["url"] === "string") return obj["url"];
  }
  return null;
}

function extractIngredients(node: JsonObject): string[] {
  const raw = node["recipeIngredient"] ?? node["ingredients"];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (typeof x === "string" ? decodeEntities(x.trim()) : ""))
    .filter(Boolean);
}

function extractInstructions(v: unknown): string[] {
  const steps: string[] = [];
  const walk = (item: unknown) => {
    if (!item) return;
    if (typeof item === "string") {
      const text = decodeEntities(stripTags(item).trim());
      if (text) steps.push(text);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(walk);
      return;
    }
    if (typeof item === "object") {
      const obj = item as JsonObject;
      // HowToSection: has nested itemListElement
      if (hasType(obj, "HowToSection") || Array.isArray(obj["itemListElement"])) {
        walk(obj["itemListElement"]);
        return;
      }
      // HowToStep: text/name
      const text = firstString(obj["text"]) ?? firstString(obj["name"]);
      if (text) steps.push(decodeEntities(stripTags(text).trim()));
    }
  };
  walk(v);
  return steps.filter(Boolean);
}

// recipeYield can be "12", 12, "12 servings", ["12 servings", "12"].
function extractServingsNumber(v: unknown): number | null {
  const text = extractServingsText(v);
  if (!text) return null;
  const m = text.match(/\d+/);
  return m ? Number(m[0]) : null;
}

function extractServingsText(v: unknown): string | null {
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) {
    // Prefer the most descriptive (longest) entry.
    const strings = v
      .map((x) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : ""))
      .filter(Boolean);
    if (strings.length === 0) return null;
    return strings.sort((a, b) => b.length - a.length)[0];
  }
  return null;
}

/** ISO 8601 duration (PT1H30M) -> "1 hr 30 min". */
export function humanizeDuration(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [, d, h, min] = m;
  const parts: string[] = [];
  // Skip zero components (e.g. "P0DT0H15M0S" -> "15 min").
  if (Number(d) > 0) parts.push(`${d} day${Number(d) !== 1 ? "s" : ""}`);
  if (Number(h) > 0) parts.push(`${h} hr`);
  if (Number(min) > 0) parts.push(`${min} min`);
  return parts.length ? parts.join(" ") : null;
}

// ---- Microformat / microdata fallback (hRecipe, Jetpack Recipe) -----------

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function ogImage($: cheerio.CheerioAPI): string | null {
  return (
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="og:image"]').attr("content") ||
    null
  );
}

/**
 * Parse a recipe from hRecipe / Jetpack Recipe / schema.org microdata markup,
 * used by many WordPress food blogs (e.g. Smitten Kitchen) that don't emit
 * JSON-LD. Returns null if no recognizable recipe container is present.
 */
function parseMicroformatRecipe(
  $: cheerio.CheerioAPI,
  sourceUrl: string,
): ScrapedRecipe | null {
  const container = $(
    '[itemtype*="Recipe"], .hrecipe, .h-recipe, .jetpack-recipe',
  ).first();
  if (!container.length) return null;

  const pick = (sel: string) => container.find(sel).first();

  const title =
    collapse(pick('[itemprop="name"], .jetpack-recipe-title, .p-name, .fn').text()) ||
    collapse($("h1.entry-title, h1").first().text()) ||
    collapse($("title").text()) ||
    "Untitled recipe";

  const ingredients = container
    .find(
      '[itemprop="recipeIngredient"], .jetpack-recipe-ingredient, .p-ingredient, li.ingredient',
    )
    .map((_, el) => collapse($(el).text()))
    .get()
    .filter(Boolean);

  if (ingredients.length === 0) return null; // not a real recipe block

  const instructions = extractMicroInstructions($, container);

  // Yield: strip a leading "Servings:" / "Serves:" label.
  const yieldText =
    collapse(
      pick('[itemprop="recipeYield"], .jetpack-recipe-servings, .p-yield, .yield').text(),
    ).replace(/^(servings?|serves|yield)\s*:?\s*/i, "") || null;

  const readTime = (sel: string): string | null => {
    const el = pick(sel);
    if (!el.length) return null;
    // Prefer a normalized ISO duration, from the element itself or a nested
    // <time datetime="…"> (Jetpack wraps the <time> in an <li>).
    const iso = el.attr("datetime") || el.find("time[datetime]").attr("datetime");
    return (
      humanizeDuration(iso ?? null) ||
      collapse(el.find(".time").text()) ||
      collapse(el.text()).replace(/^(prep|cook|total)?\s*time\s*:?\s*/i, "") ||
      null
    );
  };

  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  return {
    title,
    description,
    imageUrl:
      collapse(pick('[itemprop="image"]').attr("src") || "") ||
      ogImage($) ||
      collapse(container.find("img").first().attr("src") || "") ||
      null,
    sourceUrl,
    servings: yieldText ? Number(yieldText.match(/\d+/)?.[0] ?? NaN) || null : null,
    servingsText: yieldText,
    prepTime: readTime('[itemprop="prepTime"], .jetpack-recipe-prep-time'),
    cookTime: readTime('[itemprop="cookTime"], .jetpack-recipe-cook-time'),
    totalTime: readTime('[itemprop="totalTime"], .jetpack-recipe-time'),
    ingredients,
    instructions,
  };
}

// Footnote lines (SK appends notes starting with "*"/"**") aren't steps.
function isStepText(s: string): boolean {
  return s.length > 0 && !/^\*+/.test(s);
}

function extractMicroInstructions(
  $: cheerio.CheerioAPI,
  container: ReturnType<cheerio.CheerioAPI>,
): string[] {
  const dir = container
    .find(
      '[itemprop="recipeInstructions"], .e-instructions, .jetpack-recipe-directions',
    )
    .first();
  if (!dir.length) return [];

  // Real ordered/unordered list of steps.
  const lis = dir.find("li");
  if (lis.length) {
    return lis
      .map((_, el) => collapse($(el).text()))
      .get()
      .filter(isStepText);
  }

  // Otherwise walk children in document order: WordPress often renders the
  // method as a loose text node with footnote <p>s appended after it, so we
  // can't simply prefer <p> (that would surface a footnote as step 1).
  const steps: string[] = [];
  dir.contents().each((_, node) => {
    if (node.type === "text") {
      (node.data ?? "")
        .split(/\r?\n+/)
        .map((s) => collapse(s))
        .filter(isStepText)
        .forEach((s) => steps.push(s));
    } else if (node.type === "tag" && (node.name === "p" || node.name === "div")) {
      const t = collapse($(node).text());
      if (isStepText(t)) steps.push(t);
    }
  });

  if (steps.length) return steps;
  const raw = collapse(dir.text());
  return isStepText(raw) ? [raw] : [];
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#0?34;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾");
}
