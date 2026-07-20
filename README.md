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

Sign up with Google is enabled. The first Google sign-in creates the user and their 
personal "My Recipes" book, just like email signup. If someone later signs in with 
Google using the same email as an existing account, it maps to that same account.

