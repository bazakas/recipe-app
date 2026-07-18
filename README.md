# Recipe Book

Save recipes from any link, organize them into shared recipe books, scale them up
or down, and convert volume measurements to grams using the King Arthur ingredient
weight chart.

## Features

- **Add from a link** — paste any recipe URL; the app reads the page's
  `schema.org/Recipe` data and pulls out ingredients, steps, times, and image.
- **Recipe book** — every recipe is saved automatically; delete any time.
- **Shared books** — books work like a shared photo album. Invite people with a
  revocable share link; everyone shares the same recipes. Roles are `owner` and
  `member` today (a read-only `viewer` role can be added with no migration).
- **Scaling** — pick a multiplier (½× … 3×) or step servings up/down; all
  amounts recompute live and render as clean fractions (¾, 1 ½).
- **Grams conversion** — toggle grams and volume amounts are replaced by weights,
  matched to the King Arthur chart by ingredient name. Times/temperatures are
  never scaled.
- **Custom weights** — for ingredients not on the chart, save your own
  grams-per-cup value; it follows you across all your books.
- **Light + dark theme**, following your system preference or a manual toggle.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Prisma 6 ORM — SQLite for local dev (swap to Postgres for deploy)
- Auth.js v5 (email + password and Google sign-in, JWT sessions)

## Enabling Google sign-in

Google sign-in is optional and only appears once configured:

1. Create an **OAuth 2.0 Client ID** (Web application) at
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add the redirect URI `http://localhost:3000/api/auth/callback/google` (and your
   production URL's equivalent).
3. In `.env`, set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, then restart the dev
   server. The "Continue with Google" button appears automatically once the
   provider is configured.

The first Google sign-in creates the user and their personal "My Recipes" book,
just like email signup. If someone later signs in with Google using the same email
as an existing account, it maps to that same account.

## Getting started

```bash
npm install
npx prisma migrate dev      # create the SQLite database
npm run db:seed             # load the King Arthur weight chart (315 ingredients)
npm run dev                 # http://localhost:3000
```

Create an account at `/signup`. A personal "My Recipes" book is created for you
automatically.

## Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:seed` | (Re)load the weight chart into the database |
| `npm run db:reset` | Reset the database and re-run migrations |
| `npm run scrape:weights` | Re-scrape the King Arthur chart into `prisma/seed-data/weight-chart.json` |

## Deploying

SQLite doesn't work on serverless hosts. To deploy (e.g. Vercel):

1. Change the `datasource` provider in `prisma/schema.prisma` from `sqlite` to
   `postgresql`.
2. Set `DATABASE_URL` to a Postgres connection string (e.g. Neon) and set
   `AUTH_SECRET` in the host's environment.
3. Run `npx prisma migrate deploy` and `npm run db:seed` against the database.
