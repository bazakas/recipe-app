import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import type { ScrapedRecipe } from "@/lib/recipe-parser";

/**
 * Last-resort recipe extraction for pages with no structured data (old blog
 * posts, prose recipes). Feeds the page's visible text to Claude Haiku and asks
 * for a structured recipe. Only runs when ANTHROPIC_API_KEY is configured, and
 * only after the JSON-LD and microformat parsers have both failed.
 */

export function aiExtractionEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// JSON schema for the structured output. Scalars use "" for "unknown" (kept
// simple/strict rather than nullable unions).
const RECIPE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    isRecipe: { type: "boolean" },
    title: { type: "string" },
    servings: { type: "string" },
    prepTime: { type: "string" },
    cookTime: { type: "string" },
    totalTime: { type: "string" },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "array", items: { type: "string" } },
  },
  required: [
    "isRecipe",
    "title",
    "servings",
    "prepTime",
    "cookTime",
    "totalTime",
    "ingredients",
    "instructions",
  ],
} as const;

type ExtractedRecipe = {
  isRecipe: boolean;
  title: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  ingredients: string[];
  instructions: string[];
};

/** Reduce an HTML page to its visible article text, capped for cost. */
function pageText(html: string): { text: string; ogImage: string | null } {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, form, svg, iframe").remove();
  const root = $("article").first().length
    ? $("article").first()
    : $("main").first().length
      ? $("main").first()
      : $("body");
  const text = root.text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const ogImage =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="og:image"]').attr("content") ||
    null;
  return { text: text.slice(0, 12000), ogImage };
}

export async function extractRecipeWithAI(
  html: string,
  url: string,
): Promise<ScrapedRecipe | null> {
  if (!aiExtractionEnabled()) return null;

  const { text, ogImage } = pageText(html);
  if (text.length < 100) return null;

  const client = new Anthropic();
  let parsed: ExtractedRecipe;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      output_config: { format: { type: "json_schema", schema: RECIPE_SCHEMA } },
      system:
        "You extract a single recipe from the text of a web page. Return the " +
        "ingredients and instructions verbatim as written (one array item each, " +
        "in order). Keep ingredient amounts and units exactly as they appear. If " +
        "the page does not actually contain a cookable recipe, set isRecipe to " +
        "false and leave the arrays empty. Use an empty string for any field you " +
        "can't find.",
      messages: [
        {
          role: "user",
          content: `Extract the recipe from this page.\n\nURL: ${url}\n\nPAGE TEXT:\n${text}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    parsed = JSON.parse(block.text) as ExtractedRecipe;
  } catch (err) {
    console.error("AI extraction failed", err);
    return null;
  }

  if (!parsed.isRecipe || parsed.ingredients.length === 0) return null;

  const num = parsed.servings.match(/\d+(\.\d+)?/)?.[0];
  return {
    title: parsed.title || "Untitled recipe",
    description: null,
    imageUrl: ogImage,
    sourceUrl: url,
    servings: num ? Number(num) : null,
    servingsText: parsed.servings || null,
    prepTime: parsed.prepTime || null,
    cookTime: parsed.cookTime || null,
    totalTime: parsed.totalTime || null,
    ingredients: parsed.ingredients.filter(Boolean),
    instructions: parsed.instructions.filter(Boolean),
  };
}
