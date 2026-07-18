import { prisma } from "@/lib/prisma";
import { buildWeightMatcher, type WeightSource } from "@/lib/convert";

export type IngredientConversion = {
  gramsPerCup: number | null;
  matchedName: string | null;
  matchSource: "custom" | "chart" | null;
  matchScore: number | null;
};

/**
 * For each ingredient name, find the best grams-per-cup value, preferring the
 * user's custom weights over the King Arthur chart. Returned in the same order
 * as `names`. Conversion math (scaling + volume->grams) happens client-side so
 * it stays instant as the user adjusts scale.
 */
export async function annotateIngredientWeights(
  userId: string,
  names: (string | null)[],
): Promise<IngredientConversion[]> {
  const [chart, custom] = await Promise.all([
    prisma.weightChart.findMany({
      select: { name: true, gramsPerCup: true },
    }),
    prisma.customWeight.findMany({
      where: { userId },
      select: { name: true, gramsPerCup: true },
    }),
  ]);

  const chartMatcher = buildWeightMatcher(chart as WeightSource[]);
  const customMatcher = buildWeightMatcher(
    custom.map((c) => ({ name: c.name, gramsPerCup: c.gramsPerCup })),
  );

  return names.map((name) => {
    if (!name) {
      return { gramsPerCup: null, matchedName: null, matchSource: null, matchScore: null };
    }
    const customMatch = customMatcher(name);
    if (customMatch) {
      return {
        gramsPerCup: customMatch.source.gramsPerCup,
        matchedName: customMatch.source.name,
        matchSource: "custom",
        matchScore: customMatch.score,
      };
    }
    const chartMatch = chartMatcher(name);
    if (chartMatch) {
      return {
        gramsPerCup: chartMatch.source.gramsPerCup,
        matchedName: chartMatch.source.name,
        matchSource: "chart",
        matchScore: chartMatch.score,
      };
    }
    return { gramsPerCup: null, matchedName: null, matchSource: null, matchScore: null };
  });
}
