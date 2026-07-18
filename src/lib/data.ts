import { prisma } from "@/lib/prisma";
import { requireUserId, getBookRole, type Role } from "@/lib/authz";
import { annotateIngredientWeights } from "@/lib/recipe-conversion";
import type { CanonicalUnit } from "@/lib/units";

/** All books the current user belongs to, with their role and recipe counts. */
export async function getUserBooks() {
  const userId = await requireUserId();
  const memberships = await prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      book: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: { select: { recipes: true, memberships: true } },
        },
      },
    },
  });
  return memberships.map((m) => ({
    id: m.book.id,
    name: m.book.name,
    role: m.role as Role,
    recipeCount: m.book._count.recipes,
    memberCount: m.book._count.memberships,
  }));
}

/** A book plus its recipes (cards), or null if the user can't access it. */
export async function getBookWithRecipes(bookId: string) {
  const userId = await requireUserId();
  const role = await getBookRole(userId, bookId);
  if (!role) return null;

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      name: true,
      recipes: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          totalTime: true,
          servingsText: true,
          sourceUrl: true,
          _count: { select: { ingredients: true } },
        },
      },
    },
  });
  if (!book) return null;

  // Alphabetical by title, case-insensitive (localeCompare is reliable across
  // SQLite/Postgres, unlike a DB-level ORDER BY on SQLite which is case-sensitive).
  const recipes = [...book.recipes].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }),
  );
  return { ...book, recipes, role };
}

/** A single recipe with ingredients annotated with grams-per-cup, or null. */
export async function getRecipeForUser(recipeId: string) {
  const userId = await requireUserId();
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      addedBy: { select: { name: true, email: true } },
      book: { select: { id: true, name: true } },
    },
  });
  if (!recipe) return null;

  const role = await getBookRole(userId, recipe.bookId);
  if (!role) return null;

  const conversions = await annotateIngredientWeights(
    userId,
    recipe.ingredients.map((i) => i.name),
  );

  const ingredients = recipe.ingredients.map((ing, i) => ({
    id: ing.id,
    order: ing.order,
    raw: ing.raw,
    quantity: ing.quantity,
    quantityMax: ing.quantityMax,
    unit: ing.unit as CanonicalUnit | null,
    name: ing.name,
    note: ing.note,
    conversion: conversions[i],
  }));

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    servings: recipe.servings,
    servingsText: recipe.servingsText,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    instructions: (recipe.instructions as string[]) ?? [],
    addedBy: recipe.addedBy,
    book: recipe.book,
    role,
    ingredients,
  };
}

/** Members of a book (for the share panel), or null if no access. */
export async function getBookMembers(bookId: string) {
  const userId = await requireUserId();
  const role = await getBookRole(userId, bookId);
  if (!role) return null;

  const [members, shareLinks] = await Promise.all([
    prisma.membership.findMany({
      where: { bookId },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    role === "owner"
      ? prisma.shareLink.findMany({
          where: { bookId, revoked: false },
          orderBy: { createdAt: "desc" },
          select: { id: true, token: true, role: true, createdAt: true, expiresAt: true },
        })
      : Promise.resolve([]),
  ]);

  return { role, viewerId: userId, members, shareLinks };
}

export async function getCustomWeights() {
  const userId = await requireUserId();
  return prisma.customWeight.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}
