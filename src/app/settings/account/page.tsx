import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getUserBooks, getAccountProfile } from "@/lib/data";
import { AppHeader } from "@/components/AppHeader";
import { AccountSettings } from "@/components/AccountSettings";

export default async function AccountSettingsPage() {
  const [session, books, profile] = await Promise.all([
    auth(),
    getUserBooks(),
    getAccountProfile(),
  ]);
  if (!profile) notFound();

  const userLabel = session?.user?.name || session?.user?.email || "You";

  return (
    <>
      <AppHeader books={books} activeBookId={books[0]?.id} userLabel={userLabel} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-title text-3xl">Account settings</h1>
        <AccountSettings initial={profile} />
      </main>
    </>
  );
}
