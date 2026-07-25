import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JoinButton } from "@/components/JoinButton";

/** The book behind an invite token, with a resolved cover photo, or null. */
async function getInviteBook(token: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      revoked: true,
      expiresAt: true,
      book: {
        select: {
          name: true,
          coverImage: true,
          recipes: {
            where: { imageUrl: { not: null } },
            select: { imageUrl: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  const invalid =
    !link || link.revoked || (link.expiresAt != null && link.expiresAt < new Date());
  if (invalid) return null;

  return {
    name: link!.book.name,
    cover: link!.book.coverImage || link!.book.recipes[0]?.imageUrl || null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const book = await getInviteBook(token);
  if (!book) {
    return { title: "Invite · Recipe Box" };
  }
  const title = `Join “${book.name}” on Recipe Box`;
  const description = `You've been invited to the shared recipe book “${book.name}”.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Recipe Box",
      ...(book.cover ? { images: [{ url: book.cover }] } : {}),
    },
    twitter: {
      card: book.cover ? "summary_large_image" : "summary",
      title,
      description,
      ...(book.cover ? { images: [book.cover] } : {}),
    },
  };
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const book = await getInviteBook(token);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 text-center">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
        {book && (
          <div className="flex aspect-[3/2] items-center justify-center overflow-hidden bg-accent-soft">
            {book.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-title text-6xl text-accent">
                {book.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}
        <div className="p-8">
          <p className="label-caps mb-2 text-accent">Recipe Box</p>
          {!book ? (
            <>
              <h1 className="font-title text-2xl">Invite not valid</h1>
              <p className="mt-2 text-sm text-muted">
                This invite link has been revoked or has expired. Ask whoever shared it for
                a fresh link.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2"
              >
                Go to my books
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-title text-2xl">Join “{book.name}”</h1>
              <p className="mt-2 text-sm text-muted">
                You&apos;ve been invited to this shared recipe book. Join to view and add
                recipes.
              </p>
              <JoinButton token={token} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
