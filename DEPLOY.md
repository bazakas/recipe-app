# Deploying Recipe Book (Vercel + Neon Postgres)

This app runs on **Vercel** with a **Neon** Postgres database. Local dev uses
SQLite; production uses Postgres (Prisma makes this a provider swap).

The steps that need your login are marked **[you]**; the rest I handle in code.

---

## 1. Create the database (Neon) — [you]

1. Sign up at <https://neon.tech> (free tier is fine).
2. Create a new **Project** (any name, e.g. "recipe-book"). Pick a region near you.
3. On the project dashboard, find the **connection string** — it looks like:
   `postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
4. Copy it and give it to me (or paste it into `.env` as `DATABASE_URL`).

Once I have that, I will:
- switch `prisma/schema.prisma` provider to `postgresql`,
- generate the Postgres migration and apply it to Neon,
- seed the King Arthur weight chart into Neon.

## 2. Push the code to GitHub — [you + me]

Vercel deploys from a Git repo. Create an **empty** GitHub repo (no README), then
tell me the URL and I'll push. (Or I can walk you through `git push`.)

## 3. Deploy on Vercel — [you, guided]

1. Sign up at <https://vercel.com> with your GitHub account.
2. **Add New → Project → Import** the GitHub repo.
3. Before deploying, add these **Environment Variables**:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | a fresh secret — run `openssl rand -base64 33` |
   | `AUTH_GOOGLE_ID` | your Google OAuth client id |
   | `AUTH_GOOGLE_SECRET` | your Google OAuth client secret |

   (`AUTH_URL` is auto-detected on Vercel thanks to `trustHost`.)
4. Click **Deploy**. The build runs `prisma migrate deploy && next build`.

## 4. Point Google OAuth at the live URL — [you]

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
open your OAuth client and add an **Authorized redirect URI**:

```
https://YOUR-APP.vercel.app/api/auth/callback/google
```

(Keep the localhost one too for local dev.)

---

## Notes

- **Secrets**: never commit `.env`. It's gitignored. Set real values only in
  Vercel's env settings. If a secret leaks, rotate it.
- **Data**: production starts fresh. The weight chart is re-seeded; any recipes
  you added locally won't carry over (re-add them in the deployed app).
- **Migrations**: after changing `schema.prisma`, run `prisma migrate dev` locally
  (against a dev database) to create a migration; Vercel applies it on deploy via
  `prisma migrate deploy`.
