/**
 * Recipe web search via Tavily (https://tavily.com). Returns recipe-biased
 * results the user can pick from; the chosen URL is then run through the normal
 * recipe importer.
 *
 * Needs one env var:
 *   TAVILY_API_KEY — from the Tavily dashboard (free tier ~1,000 searches/month)
 */
export type SearchResult = {
  title: string;
  url: string;
  description: string;
  source: string | null;
  thumbnail: string | null;
};

export class SearchNotConfiguredError extends Error {
  constructor() {
    super("Web search isn't set up yet.");
    this.name = "SearchNotConfiguredError";
  }
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function searchRecipes(query: string): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new SearchNotConfiguredError();

  // Bias toward recipe pages unless the query already says so.
  const q = /\brecipe/i.test(query) ? query : `${query} recipe`;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      query: q,
      max_results: 10,
      search_depth: "basic",
      include_images: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Tavily search returned ${res.status}`);
  }

  const data = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  return (data.results ?? [])
    .map((r) => ({
      title: (r.title ?? "").trim(),
      url: r.url ?? "",
      description: (r.content ?? "").trim(),
      source: r.url ? hostname(r.url) : null,
      thumbnail: null, // Tavily returns page images separately, not per-result
    }))
    .filter((r) => r.url && r.title);
}
