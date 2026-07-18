import { auth } from "@/auth";
import { getUserBooks, getCustomWeights } from "@/lib/data";
import { AppHeader } from "@/components/AppHeader";
import { CustomWeightsManager } from "@/components/CustomWeightsManager";

export default async function WeightsPage() {
  const [session, books, weights] = await Promise.all([
    auth(),
    getUserBooks(),
    getCustomWeights(),
  ]);
  const userLabel = session?.user?.name || session?.user?.email || "You";

  return (
    <>
      <AppHeader books={books} activeBookId={books[0]?.id} userLabel={userLabel} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-title text-3xl">Custom weights</h1>
        <p className="mt-1 text-sm text-muted">
          Your own grams-per-cup values for ingredients that aren&apos;t on the King Arthur
          chart (or that you measure differently). These are used everywhere you convert to
          grams, and follow you across all your books.
        </p>
        <CustomWeightsManager
          weights={weights.map((w) => ({
            id: w.id,
            name: w.name,
            gramsPerCup: w.gramsPerCup,
          }))}
        />
      </main>
    </>
  );
}
