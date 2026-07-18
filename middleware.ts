import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware uses only the edge-safe config (no Prisma). The `authorized`
// callback decides which routes require a session.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except Next internals, static assets, and the auth API.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
