/**
 * Thin wrapper over the Brave Search API. Returns recipe-biased web results
 * that the user can pick from; the chosen URL is then run through the normal
 * recipe importer.
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

function stripTags(s: string): string {
  return (s || "").replace(/<[^>]+>/g, "").trim();
}

export async function searchRecipes(query: string): Promise<SearchResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new SearchNotConfiguredError();

  // Bias toward recipe pages unless the query already says so.
  const q = /\brecipe/i.test(query) ? query : `${query} recipe`;
  const url =
    "https://api.search.brave.com/res/v1/web/search?" +
    new URLSearchParams({ q, count: "10", safesearch: "moderate" }).toString();

  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
  });
  if (!res.ok) {
    throw new Error(`Brave search returned ${res.status}`);
  }

  const data = (await res.json()) as {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
        meta_url?: { hostname?: string };
        profile?: { name?: string };
        thumbnail?: { src?: string };
      }>;
    };
  };

  const results = data.web?.results ?? [];
  return results
    .map((r) => ({
      title: stripTags(r.title ?? ""),
      url: r.url ?? "",
      description: stripTags(r.description ?? ""),
      source: r.meta_url?.hostname ?? r.profile?.name ?? null,
      thumbnail: r.thumbnail?.src ?? null,
    }))
    .filter((r) => r.url && r.title);
}
