import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user || !user.passwordHash) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

// Only enable Google when its credentials are configured, so the app runs
// without them in development.
export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
if (googleEnabled) {
  providers.push(Google({ allowDangerousEmailAccountLinking: true }));
}

/** Ensure a User (and their personal book) exists for the given email. */
async function ensureUser(email: string, name?: string | null) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email,
      name: name ?? null,
      passwordHash: "", // OAuth-only account; can't sign in with a password
      memberships: { create: { role: "owner", book: { create: { name: "My Recipes" } } } },
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // On first Google sign-in, create the app user + their personal book.
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        await ensureUser(email, user.name);
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // On fresh sign-in (or any token missing our id), resolve our DB user and
      // hydrate the profile (id/name/picture) onto the token.
      const freshSignIn = Boolean(user) || (!token.id && Boolean(token.email));
      if (freshSignIn) {
        const email = (user?.email ?? token.email)?.toLowerCase();
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, image: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.name = dbUser.name;
            token.picture = dbUser.image ?? null;
          }
        }
      }
      // Client-side session.update({ name, image }) after a profile change.
      if (trigger === "update" && session) {
        const s = session as { name?: string | null; image?: string | null };
        if ("name" in s) token.name = s.name ?? null;
        if ("image" in s) token.picture = s.image ?? null;
      }
      return token;
    },
  },
});
