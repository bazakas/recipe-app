import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no database / Node-only imports). Used by middleware
 * for route protection. The Credentials provider (which needs Prisma + bcrypt)
 * is added in auth.ts, which runs in the Node runtime.
 */
export const authConfig = {
  // Trust the host header behind Vercel's proxy (and other hosts that set
  // x-forwarded-host). Auth.js requires this in production.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // real providers are added in auth.ts
  callbacks: {
    // Gate pages for signed-out users, redirecting them to /login. Auth pages
    // are public, and API routes are always allowed through — they enforce
    // their own auth (e.g. /api/signup must be reachable when logged out).
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isPublic =
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/api");
      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
