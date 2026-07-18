import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/authz";
import { scrapeRecipe, RecipeParseError } from "@/lib/recipe-parser";
import { parseIngredient } from "@/lib/ingredient-parser";

const schema = z.object({ url: z.string().url() });

// Parse a recipe URL and return the scraped + structured result WITHOUT saving.
// Lets the UI preview before adding to a book.
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
  }

  try {
    const recipe = await scrapeRecipe(parsed.data.url);
    return NextResponse.json({
      ...recipe,
      ingredients: recipe.ingredients.map((raw, i) => ({
        order: i,
        ...parseIngredient(raw),
      })),
    });
  } catch (err) {
    if (err instanceof RecipeParseError) {
      const status = err.code === "fetch_failed" ? 502 : 422;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    console.error("parse error", err);
    return NextResponse.json(
      { error: "Something went wrong parsing that recipe." },
      { status: 500 },
    );
  }
}
