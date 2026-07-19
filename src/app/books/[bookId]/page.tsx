import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getUserBooks, getBookWithRecipes } from "@/lib/data";
import { AppHeader } from "@/components/AppHeader";
import { RecipeLibrary } from "@/components/RecipeLibrary";
import { EmptyLibrary } from "@/components/EmptyLibrary";

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const [session, books, book] = await Promise.all([
    auth(),
    getUserBooks(),
    getBookWithRecipes(bookId),
  ]);
  if (!book) notFound();

  const userLabel = session?.user?.name || session?.user?.email || "You";
  const canEdit = book.role !== "viewer";

  return (
    <>
      <AppHeader books={books} activeBookId={bookId} userLabel={userLabel} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-title text-3xl">{book.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {book.recipes.length} {book.recipes.length === 1 ? "recipe" : "recipes"}
            </p>
          </div>
        </div>

        {book.recipes.length === 0 ? (
          <EmptyLibrary bookId={bookId} canEdit={canEdit} />
        ) : (
          <RecipeLibrary
            currentBookId={bookId}
            canEdit={canEdit}
            books={books.map((b) => ({ id: b.id, name: b.name, role: b.role }))}
            recipes={book.recipes}
          />
        )}
      </main>
    </>
  );
}
