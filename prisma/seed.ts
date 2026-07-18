/**
 * Seeds the global WeightChart table from the scraped King Arthur data.
 * Idempotent: upserts by ingredient name. Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

type WeightEntry = {
  name: string;
  volumeRaw: string;
  grams: number;
  ounces: number | null;
  gramsPerCup: number | null;
};

async function main() {
  const data: WeightEntry[] = JSON.parse(
    readFileSync(resolve(process.cwd(), "prisma/seed-data/weight-chart.json"), "utf8"),
  );

  let count = 0;
  for (const e of data) {
    await prisma.weightChart.upsert({
      where: { name: e.name },
      create: {
        name: e.name,
        volumeRaw: e.volumeRaw,
        grams: e.grams,
        ounces: e.ounces ?? undefined,
        gramsPerCup: e.gramsPerCup ?? undefined,
      },
      update: {
        volumeRaw: e.volumeRaw,
        grams: e.grams,
        ounces: e.ounces ?? undefined,
        gramsPerCup: e.gramsPerCup ?? undefined,
      },
    });
    count++;
  }
  console.log(`Seeded ${count} weight-chart ingredients.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
