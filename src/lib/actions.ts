"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, getBookRole, canEdit, canManage, type Role } from "@/lib/authz";
import { scrapeRecipe, RecipeParseError } from "@/lib/recipe-parser";
import { parseIngredient } from "@/lib/ingredient-parser";

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

// ---- Books --------------------------------------------------------------

export async function createBook(name: string): Promise<ActionResult<{ bookId: string }>> {
  const userId = await requireUserId();
  const clean = name.trim();
  if (!clean) return fail("Give the book a name.");
  if (clean.length > 80) return fail("That name is too long.");

  const book = await prisma.book.create({
    data: {
      name: clean,
      memberships: { create: { userId, role: "owner" } },
    },
  });
  revalidatePath("/");
  return { ok: true, bookId: book.id };
}

export async function renameBook(bookId: string, name: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!canManage(await getBookRole(userId, bookId)))
    return fail("Only the owner can rename this book.");
  const clean = name.trim();
  if (!clean) return fail("Give the book a name.");

  await prisma.book.update({ where: { id: bookId }, data: { name: clean } });
  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
  return { ok: true };
}

export async function deleteBook(bookId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!canManage(await getBookRole(userId, bookId)))
    return fail("Only the owner can delete this book.");

  // Deletes the book and all its recipes (cascade). The home page handles the
  // case where this leaves the user with no books.
  await prisma.book.delete({ where: { id: bookId } });
  revalidatePath("/");
  return { ok: true };
}

// ---- Recipes ------------------------------------------------------------

const urlSchema = z.string().url();

export async function addRecipeFromUrl(
  bookId: string,
  url: string,
): Promise<ActionResult<{ recipeId: string }>> {
  const userId = await requireUserId();
  if (!canEdit(await getBookRole(userId, bookId)))
    return fail("You don't have permission to add recipes to this book.");
  if (!urlSchema.safeParse(url.trim()).success)
    return fail("Please paste a valid recipe URL (starting with http).");

  let scraped;
  try {
    scraped = await scrapeRecipe(url.trim());
  } catch (err) {
    if (err instanceof RecipeParseError) return fail(err.message);
    console.error("scrape failed", err);
    return fail("Something went wrong reading that recipe.");
  }

  const recipe = await prisma.recipe.create({
    data: {
      bookId,
      addedById: userId,
      title: scraped.title,
      description: scraped.description,
      imageUrl: scraped.imageUrl,
      sourceUrl: scraped.sourceUrl,
      servings: scraped.servings,
      servingsText: scraped.servingsText,
      prepTime: scraped.prepTime,
      cookTime: scraped.cookTime,
      totalTime: scraped.totalTime,
      instructions: scraped.instructions,
      ingredients: {
        create: scraped.ingredients.map((raw, i) => {
          const p = parseIngredient(raw);
          return {
            order: i,
            raw: p.raw,
            quantity: p.quantity,
            quantityMax: p.quantityMax,
            unit: p.unit,
            name: p.name,
            note: p.note,
          };
        }),
      },
    },
  });

  revalidatePath(`/books/${bookId}`);
  return { ok: true, recipeId: recipe.id };
}

const manualRecipeSchema = z.object({
  title: z.string().trim().min(1, "Give the recipe a title.").max(200),
  servings: z.string().trim().optional(),
  prepTime: z.string().trim().max(60).optional(),
  cookTime: z.string().trim().max(60).optional(),
  totalTime: z.string().trim().max(60).optional(),
  imageUrl: z.string().trim().max(2000).optional(),
  ingredients: z.string().max(20000), // one per line
  instructions: z.string().max(50000), // one step per line
  notes: z.string().trim().max(10000).optional(),
});

export type ManualRecipeInput = z.input<typeof manualRecipeSchema>;

export async function addManualRecipe(
  bookId: string,
  input: ManualRecipeInput,
): Promise<ActionResult<{ recipeId: string }>> {
  const userId = await requireUserId();
  if (!canEdit(await getBookRole(userId, bookId)))
    return fail("You don't have permission to add recipes to this book.");

  const parsed = manualRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  }
  const data = parsed.data;

  const ingredientLines = data.ingredients
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const instructionLines = data.instructions
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (ingredientLines.length === 0) return fail("Add at least one ingredient.");

  // Only accept a valid http(s) image URL; ignore anything else.
  const imageUrl =
    data.imageUrl && /^https?:\/\//i.test(data.imageUrl) ? data.imageUrl : null;
  const servingsNum = data.servings ? Number(data.servings.match(/\d+(\.\d+)?/)?.[0]) : NaN;

  const recipe = await prisma.recipe.create({
    data: {
      bookId,
      addedById: userId,
      title: data.title,
      sourceUrl: null,
      imageUrl,
      servings: Number.isFinite(servingsNum) ? servingsNum : null,
      servingsText: data.servings || null,
      prepTime: data.prepTime || null,
      cookTime: data.cookTime || null,
      totalTime: data.totalTime || null,
      instructions: instructionLines,
      notes: data.notes || null,
      ingredients: {
        create: ingredientLines.map((raw, i) => {
          const p = parseIngredient(raw);
          return {
            order: i,
            raw: p.raw,
            quantity: p.quantity,
            quantityMax: p.quantityMax,
            unit: p.unit,
            name: p.name,
            note: p.note,
          };
        }),
      },
    },
  });

  revalidatePath(`/books/${bookId}`);
  return { ok: true, recipeId: recipe.id };
}

export async function updateRecipe(
  recipeId: string,
  input: ManualRecipeInput,
): Promise<ActionResult<{ recipeId: string }>> {
  const userId = await requireUserId();
  const existing = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { bookId: true },
  });
  if (!existing) return fail("Recipe not found.");
  if (!canEdit(await getBookRole(userId, existing.bookId)))
    return fail("You don't have permission to edit this recipe.");

  const parsed = manualRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  }
  const data = parsed.data;

  const ingredientLines = data.ingredients
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const instructionLines = data.instructions
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (ingredientLines.length === 0) return fail("Add at least one ingredient.");

  const imageUrl =
    data.imageUrl && /^https?:\/\//i.test(data.imageUrl) ? data.imageUrl : null;
  const servingsNum = data.servings ? Number(data.servings.match(/\d+(\.\d+)?/)?.[0]) : NaN;

  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      title: data.title,
      imageUrl,
      servings: Number.isFinite(servingsNum) ? servingsNum : null,
      servingsText: data.servings || null,
      prepTime: data.prepTime || null,
      cookTime: data.cookTime || null,
      totalTime: data.totalTime || null,
      instructions: instructionLines,
      notes: data.notes || null,
      modified: true, // flag so imported recipes show "modified from" the source
      ingredients: {
        deleteMany: {},
        create: ingredientLines.map((raw, i) => {
          const p = parseIngredient(raw);
          return {
            order: i,
            raw: p.raw,
            quantity: p.quantity,
            quantityMax: p.quantityMax,
            unit: p.unit,
            name: p.name,
            note: p.note,
          };
        }),
      },
    },
  });

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/books/${existing.bookId}`);
  return { ok: true, recipeId };
}

export async function deleteRecipe(recipeId: string): Promise<ActionResult<{ bookId: string }>> {
  const userId = await requireUserId();
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { bookId: true },
  });
  if (!recipe) return fail("Recipe not found.");
  if (!canEdit(await getBookRole(userId, recipe.bookId)))
    return fail("You don't have permission to delete this recipe.");

  await prisma.recipe.delete({ where: { id: recipeId } });
  revalidatePath(`/books/${recipe.bookId}`);
  return { ok: true, bookId: recipe.bookId };
}

/** Confirm the user can edit every source book for the given recipes. */
async function loadEditableRecipes(userId: string, recipeIds: string[]) {
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    select: { id: true, bookId: true },
  });
  const bookIds = [...new Set(recipes.map((r) => r.bookId))];
  for (const bookId of bookIds) {
    if (!canEdit(await getBookRole(userId, bookId))) return null;
  }
  return { recipes, bookIds };
}

export async function moveRecipes(
  recipeIds: string[],
  targetBookId: string,
): Promise<ActionResult<{ count: number }>> {
  const userId = await requireUserId();
  if (recipeIds.length === 0) return fail("No recipes selected.");
  if (!canEdit(await getBookRole(userId, targetBookId)))
    return fail("You don't have permission to add recipes to that book.");

  const loaded = await loadEditableRecipes(userId, recipeIds);
  if (!loaded) return fail("You don't have permission to move these recipes.");

  const res = await prisma.recipe.updateMany({
    where: { id: { in: recipeIds } },
    data: { bookId: targetBookId },
  });

  for (const bookId of loaded.bookIds) revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${targetBookId}`);
  revalidatePath("/");
  return { ok: true, count: res.count };
}

export async function deleteRecipes(
  recipeIds: string[],
): Promise<ActionResult<{ count: number }>> {
  const userId = await requireUserId();
  if (recipeIds.length === 0) return fail("No recipes selected.");

  const loaded = await loadEditableRecipes(userId, recipeIds);
  if (!loaded) return fail("You don't have permission to delete these recipes.");

  const res = await prisma.recipe.deleteMany({ where: { id: { in: recipeIds } } });
  for (const bookId of loaded.bookIds) revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
  return { ok: true, count: res.count };
}

// ---- Sharing ------------------------------------------------------------

const shareRoleSchema = z.enum(["member", "viewer"]);

export async function createShareLink(
  bookId: string,
  role: string,
): Promise<ActionResult<{ token: string }>> {
  const userId = await requireUserId();
  if (!canManage(await getBookRole(userId, bookId)))
    return fail("Only the owner can create share links.");
  const parsedRole = shareRoleSchema.safeParse(role);
  if (!parsedRole.success) return fail("Invalid role.");

  const token = randomBytes(18).toString("base64url");
  await prisma.shareLink.create({
    data: { bookId, token, role: parsedRole.data, createdById: userId },
  });
  revalidatePath(`/books/${bookId}/share`);
  return { ok: true, token };
}

export async function revokeShareLink(shareLinkId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const link = await prisma.shareLink.findUnique({
    where: { id: shareLinkId },
    select: { bookId: true },
  });
  if (!link) return fail("Link not found.");
  if (!canManage(await getBookRole(userId, link.bookId)))
    return fail("Only the owner can revoke links.");

  await prisma.shareLink.update({ where: { id: shareLinkId }, data: { revoked: true } });
  revalidatePath(`/books/${link.bookId}/share`);
  return { ok: true };
}

export async function joinByToken(token: string): Promise<ActionResult<{ bookId: string }>> {
  const userId = await requireUserId();
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link || link.revoked) return fail("This invite link is no longer valid.");
  if (link.expiresAt && link.expiresAt < new Date())
    return fail("This invite link has expired.");

  const existing = await getBookRole(userId, link.bookId);
  if (existing) return { ok: true, bookId: link.bookId }; // already a member

  const role: Role = link.role === "viewer" ? "viewer" : "member";
  await prisma.membership.create({
    data: { userId, bookId: link.bookId, role },
  });
  revalidatePath("/");
  return { ok: true, bookId: link.bookId };
}

export async function leaveOrRemoveMember(
  bookId: string,
  targetUserId: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const role = await getBookRole(userId, bookId);
  if (!role) return fail("You're not a member of this book.");

  const isSelf = targetUserId === userId;
  if (!isSelf && !canManage(role))
    return fail("Only the owner can remove members.");

  const targetRole = await getBookRole(targetUserId, bookId);
  if (!targetRole) return fail("That person isn't a member.");

  // Protect the last owner.
  if (targetRole === "owner") {
    const ownerCount = await prisma.membership.count({
      where: { bookId, role: "owner" },
    });
    if (ownerCount <= 1) {
      const memberCount = await prisma.membership.count({ where: { bookId } });
      if (memberCount > 1)
        return fail("Make someone else an owner before leaving this shared book.");
      // Last person in the book — delete the whole book.
      await prisma.book.delete({ where: { id: bookId } });
      revalidatePath("/");
      return { ok: true };
    }
  }

  await prisma.membership.delete({
    where: { userId_bookId: { userId: targetUserId, bookId } },
  });
  revalidatePath("/");
  revalidatePath(`/books/${bookId}/share`);
  return { ok: true };
}

// ---- Custom weights -----------------------------------------------------

export async function addCustomWeight(
  name: string,
  gramsPerCup: number,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const clean = name.trim();
  if (!clean) return fail("Enter an ingredient name.");
  if (!Number.isFinite(gramsPerCup) || gramsPerCup <= 0)
    return fail("Enter grams per cup as a positive number.");

  await prisma.customWeight.upsert({
    where: { userId_name: { userId, name: clean } },
    create: { userId, name: clean, gramsPerCup },
    update: { gramsPerCup },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCustomWeight(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const cw = await prisma.customWeight.findUnique({ where: { id }, select: { userId: true } });
  if (!cw || cw.userId !== userId) return fail("Not found.");
  await prisma.customWeight.delete({ where: { id } });
  revalidatePath("/settings/weights");
  return { ok: true };
}

// ---- Account ------------------------------------------------------------

export async function updateProfile(
  name: string,
  image: string,
): Promise<ActionResult<{ name: string | null; image: string | null }>> {
  const userId = await requireUserId();
  const cleanName = name.trim().slice(0, 80) || null;
  // Only accept a valid http(s) image URL; ignore anything else.
  const imageUrl = image.trim() && /^https?:\/\//i.test(image.trim()) ? image.trim() : null;

  await prisma.user.update({
    where: { id: userId },
    data: { name: cleanName, image: imageUrl },
  });
  revalidatePath("/");
  return { ok: true, name: cleanName, image: imageUrl };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return fail("Account not found.");

  // Users created via Google have an empty passwordHash — they can set one
  // without providing a current password.
  const hasPassword = Boolean(user.passwordHash);
  if (hasPassword) {
    if (!currentPassword) return fail("Enter your current password.");
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return fail("Your current password is incorrect.");
  }
  if (newPassword.length < 8) {
    return fail("New password must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true };
}
