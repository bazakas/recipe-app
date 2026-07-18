import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JoinButton } from "@/components/JoinButton";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      revoked: true,
      expiresAt: true,
      book: { select: { name: true } },
    },
  });

  const invalid =
    !link || link.revoked || (link.expiresAt != null && link.expiresAt < new Date());

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-[var(--shadow)]">
        <p className="label-caps mb-2 text-accent">Recipe Book</p>
        {invalid ? (
          <>
            <h1 className="font-title text-2xl">Invite not valid</h1>
            <p className="mt-2 text-sm text-muted">
              This invite link has been revoked or has expired. Ask whoever shared it for a
              fresh link.
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
            <h1 className="font-title text-2xl">Join “{link!.book.name}”</h1>
            <p className="mt-2 text-sm text-muted">
              You&apos;ve been invited to this shared recipe book. Join to view and add
              recipes.
            </p>
            <JoinButton token={token} />
          </>
        )}
      </div>
    </main>
  );
}
