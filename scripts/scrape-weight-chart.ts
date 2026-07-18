/**
 * Scrapes the King Arthur Baking ingredient weight chart into a seed JSON file.
 *
 * The chart page server-renders a clean HTML table:
 *   <td class="views-field views-field-title"> Ingredient (may wrap an <a> or <span>)
 *   <td class="views-field views-field-field-volume"> e.g. "1 cup", "8 tablespoons (1/2 cup)"
 *   <td class="views-field views-field-field-ounces"> e.g. "4 1/4"
 *   <td class="views-field views-field-field-grams">  e.g. "120"
 *
 * We normalize each row to grams-per-US-cup where the volume unit is cup/tbsp/tsp,
 * which is what the app uses to convert recipe volumes to grams.
 *
 * Usage:
 *   npx tsx scripts/scrape-weight-chart.ts            # fetch live
 *   npx tsx scripts/scrape-weight-chart.ts <file.html> # parse a local HTML file
 */
import * as cheerio from "cheerio";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE_URL =
  "https://www.kingarthurbaking.com/learn/ingredient-weight-chart";
const OUT_PATH = resolve(process.cwd(), "prisma/seed-data/weight-chart.json");

// Volume conversions to US cups.
const UNIT_TO_CUPS: Record<string, number> = {
  cup: 1,
  cups: 1,
  tablespoon: 1 / 16,
  tablespoons: 1 / 16,
  tbsp: 1 / 16,
  teaspoon: 1 / 48,
  teaspoons: 1 / 48,
  tsp: 1 / 48,
};

/** Parse a mixed-number / fraction string like "4 1/4", "1/2", "3" -> number. */
function parseAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

export type WeightEntry = {
  name: string;
  volumeRaw: string;
  grams: number;
  ounces: number | null;
  /** grams per 1 US cup, when the volume unit is cup/tbsp/tsp; null otherwise */
  gramsPerCup: number | null;
};

/**
 * Turn a volume string into cups. Prefers a "(... cup)" hint in parentheses
 * (e.g. "8 tablespoons (1/2 cup)" -> 0.5), else parses the leading measure.
 */
function volumeToCups(volumeRaw: string): number | null {
  const paren = volumeRaw.match(/\(([^)]*\bcups?\b[^)]*)\)/i);
  const target = paren ? paren[1] : volumeRaw;
  const m = target.match(
    /([\d\s/]+?)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp)\b/i,
  );
  if (!m) return null;
  const amount = parseAmount(m[1]);
  const factor = UNIT_TO_CUPS[m[2].toLowerCase()];
  if (amount == null || !factor) return null;
  return amount * factor;
}

// The site inserts soft hyphens (U+00AD) and other invisible characters into
// words like "table­spoon" for word-wrapping. Strip them before parsing.
function clean(s: string): string {
  return s
    .replace(/[­​‌‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHtml(html: string): WeightEntry[] {
  const $ = cheerio.load(html);
  const entries: WeightEntry[] = [];
  const seen = new Set<string>();

  $("tr").each((_, tr) => {
    const $tr = $(tr);
    const name = clean($tr.find(".views-field-title").text());
    const volumeRaw = clean($tr.find(".views-field-field-volume").text());
    const ouncesRaw = clean($tr.find(".views-field-field-ounces").text());
    const gramsRaw = clean($tr.find(".views-field-field-grams").text());
    if (!name || !gramsRaw) return; // header / malformed rows

    const grams = parseAmount(gramsRaw);
    if (grams == null) return;

    const key = name.toLowerCase();
    if (seen.has(key)) return; // keep first occurrence
    seen.add(key);

    const cups = volumeToCups(volumeRaw);
    entries.push({
      name,
      volumeRaw,
      grams,
      ounces: parseAmount(ouncesRaw),
      gramsPerCup: cups ? Math.round((grams / cups) * 100) / 100 : null,
    });
  });

  return entries;
}

async function main() {
  const localFile = process.argv[2];
  let html: string;
  if (localFile) {
    console.log(`Parsing local file: ${localFile}`);
    html = readFileSync(resolve(localFile), "utf8");
  } else {
    console.log(`Fetching ${SOURCE_URL} ...`);
    const res = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    html = await res.text();
  }

  const entries = parseHtml(html);
  if (entries.length < 50) {
    throw new Error(
      `Only parsed ${entries.length} entries — markup may have changed.`,
    );
  }
  const withCup = entries.filter((e) => e.gramsPerCup != null).length;
  writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2));
  console.log(
    `Wrote ${entries.length} ingredients (${withCup} with grams/cup) -> ${OUT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
