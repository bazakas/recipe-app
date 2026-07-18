import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getUserBooks, getRecipeForUser } from "@/lib/data";
import { AppHeader } from "@/components/AppHeader";
import { RecipeView } from "@/components/RecipeView";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const [session, recipe] = await Promise.all([auth(), getRecipeForUser(recipeId)]);
  if (!recipe) notFound();

  const books = await getUserBooks();
  const userLabel = session?.user?.name || session?.user?.email || "You";

  return (
    <>
      <AppHeader books={books} activeBookId={recipe.book.id} userLabel={userLabel} />
      <RecipeView recipe={recipe} />
    </>
  );
}
