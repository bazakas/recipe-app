import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getUserBooks, getBookMembers, getBookWithRecipes } from "@/lib/data";
import { AppHeader } from "@/components/AppHeader";
import { SharePanel } from "@/components/SharePanel";

export default async function SharePage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const [session, books, data, book] = await Promise.all([
    auth(),
    getUserBooks(),
    getBookMembers(bookId),
    getBookWithRecipes(bookId),
  ]);
  if (!data || !book) notFound();

  const userLabel = session?.user?.name || session?.user?.email || "You";

  return (
    <>
      <AppHeader books={books} activeBookId={bookId} userLabel={userLabel} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-title text-3xl">Share “{book.name}”</h1>
        <p className="mt-1 text-sm text-muted">
          Invite people to this recipe book. Everyone shares the same recipes, like a
          shared photo album.
        </p>
        <SharePanel
          bookId={bookId}
          role={data.role}
          viewerId={data.viewerId}
          members={data.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
          }))}
          shareLinks={data.shareLinks.map((l) => ({
            id: l.id,
            token: l.token,
            role: l.role,
          }))}
        />
      </main>
    </>
  );
}
