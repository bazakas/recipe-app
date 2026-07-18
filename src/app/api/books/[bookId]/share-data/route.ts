import { NextResponse } from "next/server";
import { getBookMembers } from "@/lib/data";

// Returns the sharing data (role, members, invite links) for the Share modal.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const data = await getBookMembers(bookId);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    role: data.role,
    viewerId: data.viewerId,
    members: data.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    })),
    shareLinks: data.shareLinks.map((l) => ({
      id: l.id,
      token: l.token,
      role: l.role,
    })),
  });
}
