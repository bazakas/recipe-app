import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserBooks, getRecipeForUser } from "@/lib/data";
import { AppHeader } from "@/components/AppHeader";
import { ManualRecipeForm, type RecipeFormValues } from "@/components/ManualRecipeForm";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const [session, recipe] = await Promise.all([auth(), getRecipeForUser(recipeId)]);
  if (!recipe) notFound();
  if (recipe.role === "viewer") redirect(`/recipes/${recipeId}`);

  const books = await getUserBooks();
  const userLabel = session?.user?.name || session?.user?.email || "You";

  const initial: RecipeFormValues = {
    title: recipe.title,
    servings: recipe.servingsText ?? (recipe.servings != null ? String(recipe.servings) : ""),
    prepTime: recipe.prepTime ?? "",
    cookTime: recipe.cookTime ?? "",
    totalTime: recipe.totalTime ?? "",
    imageUrl: recipe.imageUrl ?? "",
    ingredients: recipe.ingredients.map((i) => i.raw).join("\n"),
    instructions: recipe.instructions.join("\n"),
  };

  return (
    <>
      <AppHeader books={books} activeBookId={recipe.book.id} userLabel={userLabel} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link href={`/recipes/${recipeId}`} className="text-sm text-muted hover:text-ink">
          ← Back to recipe
        </Link>
        <h1 className="mt-2 font-title text-3xl">Edit recipe</h1>
        {recipe.sourceUrl && (
          <p className="mt-1 text-sm text-muted">
            Edits are saved to your copy — the original link stays untouched.
          </p>
        )}
        <ManualRecipeForm bookId={recipe.book.id} recipeId={recipeId} initial={initial} />
      </main>
    </>
  );
}
