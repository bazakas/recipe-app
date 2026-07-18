import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserBooks } from "@/lib/data";
import { getBookRole, canEdit } from "@/lib/authz";
import { AppHeader } from "@/components/AppHeader";
import { ManualRecipeForm } from "@/components/ManualRecipeForm";

export default async function NewRecipePage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const [session, books] = await Promise.all([auth(), getUserBooks()]);
  const book = books.find((b) => b.id === bookId);
  if (!book) notFound();
  if (!canEdit(await getBookRole(session!.user.id, bookId))) {
    redirect(`/books/${bookId}`);
  }

  const userLabel = session?.user?.name || session?.user?.email || "You";

  return (
    <>
      <AppHeader books={books} activeBookId={bookId} userLabel={userLabel} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link href={`/books/${bookId}`} className="text-sm text-muted hover:text-ink">
          ← {book.name}
        </Link>
        <h1 className="mt-2 font-title text-3xl">Add a recipe by hand</h1>
        <p className="mt-1 text-sm text-muted">
          Type it out yourself. It scales and converts to grams just like an imported
          recipe.
        </p>
        <ManualRecipeForm bookId={bookId} />
      </main>
    </>
  );
}
