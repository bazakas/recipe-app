import { auth } from "@/auth";
import { getUserBooks } from "@/lib/data";
import { AppHeader } from "@/components/AppHeader";
import { BookCard } from "@/components/BookCard";
import { CreateBookCard } from "@/components/CreateBookCard";

export default async function Home() {
  const [session, books] = await Promise.all([auth(), getUserBooks()]);
  const userLabel = session?.user?.name || session?.user?.email || "You";

  return (
    <>
      <AppHeader books={books} userLabel={userLabel} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-title text-3xl">Your recipe books</h1>
        <p className="mt-1 text-sm text-muted">
          {books.length} {books.length === 1 ? "book" : "books"} · open one to see its recipes
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}

          <CreateBookCard />
        </div>
      </main>
    </>
  );
}
