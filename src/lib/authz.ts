import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type Role = "owner" | "member" | "viewer";

// Role hierarchy for permission checks. Higher number = more privileges.
// "viewer" isn't granted anywhere yet, but is defined so it drops in later
// with no schema change (see the Membership model comment).
const RANK: Record<Role, number> = { viewer: 0, member: 1, owner: 2 };

export function canView(role: Role | null): boolean {
  return role != null;
}
/** Can add/delete recipes in the book. */
export function canEdit(role: Role | null): boolean {
  return role != null && RANK[role] >= RANK.member;
}
/** Can rename/delete the book and manage members/share links. */
export function canManage(role: Role | null): boolean {
  return role === "owner";
}

/** The signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Redirects to /login if not signed in; returns the user id otherwise.
 * Used by page data loaders and server actions (both valid redirect contexts),
 * as a reliable guard independent of middleware.
 */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) redirect("/login");
  return id;
}

/** The user's role in a book, or null if they're not a member. */
export async function getBookRole(
  userId: string,
  bookId: string,
): Promise<Role | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId_bookId: { userId, bookId } },
    select: { role: true },
  });
  return (membership?.role as Role | undefined) ?? null;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}
