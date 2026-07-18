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
    // Gate every route except the auth pages. Unauthenticated users are
    // redirected to /login by NextAuth.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicPaths = ["/login", "/signup"];
      const isPublic = publicPaths.some((p) => nextUrl.pathname.startsWith(p));
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
