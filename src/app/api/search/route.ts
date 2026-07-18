import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/authz";
import { searchRecipes, SearchNotConfiguredError } from "@/lib/recipe-search";

// Recipe web search (Brave). Auth-only; used by the Add Recipe dialog.
export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Enter something to search for." }, { status: 400 });
  }

  try {
    const results = await searchRecipes(q);
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof SearchNotConfiguredError) {
      return NextResponse.json(
        { error: err.message, code: "not_configured" },
        { status: 503 },
      );
    }
    console.error("recipe search failed", err);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 502 },
    );
  }
}
