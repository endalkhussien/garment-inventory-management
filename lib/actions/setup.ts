"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

const branchSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  address: z.string().trim().optional().nullable(),
  isWarehouse: z.boolean().default(false),
  isShop: z.boolean().default(true),
});

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().nullable(),
});

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

export async function upsertBranch(
  input: z.infer<typeof branchSchema> & { id?: string },
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    if (input.id) {
      await prisma.branch.update({
        where: { id: input.id },
        data: {
          ...parsed.data,
          address: emptyToNull(parsed.data.address),
        },
      });
      revalidatePath("/setup/branches");
      return { success: true, id: input.id };
    }

    const created = await prisma.branch.create({
      data: {
        ...parsed.data,
        address: emptyToNull(parsed.data.address),
      },
    });
    revalidatePath("/setup/branches");
    return { success: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Branch code already exists." };
    }
    return { success: false, error: "Could not save branch." };
  }
}

export async function createMaterialCategory(
  input: z.infer<typeof categorySchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const created = await prisma.materialCategory.create({
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
    revalidatePath("/setup/categories");
    revalidatePath("/inventory/raw-materials");
    return { success: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Category already exists." };
    }
    return { success: false, error: "Could not create category." };
  }
}

export async function createProductCategory(
  input: z.infer<typeof categorySchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const created = await prisma.productCategory.create({
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
    revalidatePath("/setup/categories");
    revalidatePath("/products");
    return { success: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Category already exists." };
    }
    return { success: false, error: "Could not create category." };
  }
}

export async function createAssetType(
  input: z.infer<typeof categorySchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const created = await prisma.assetType.create({
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
    revalidatePath("/setup/categories");
    revalidatePath("/inventory/capital-assets");
    return { success: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Type already exists." };
    }
    return { success: false, error: "Could not create asset type." };
  }
}

export async function setBranchActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.branch.update({ where: { id }, data: { isActive } });
    revalidatePath("/setup/branches");
    return { success: true, id };
  } catch {
    return { success: false, error: "Branch not found." };
  }
}

export async function updateMaterialCategory(
  id: string,
  input: z.infer<typeof categorySchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }
  try {
    await prisma.materialCategory.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
    revalidatePath("/setup/categories");
    return { success: true, id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Category already exists." };
    }
    return { success: false, error: "Category not found." };
  }
}

export async function updateProductCategory(
  id: string,
  input: z.infer<typeof categorySchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }
  try {
    await prisma.productCategory.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
    revalidatePath("/setup/categories");
    return { success: true, id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Category already exists." };
    }
    return { success: false, error: "Category not found." };
  }
}

export async function updateAssetType(
  id: string,
  input: z.infer<typeof categorySchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }
  try {
    await prisma.assetType.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
    revalidatePath("/setup/categories");
    return { success: true, id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Type already exists." };
    }
    return { success: false, error: "Type not found." };
  }
}

export async function setMaterialCategoryActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.materialCategory.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/setup/categories");
    revalidatePath("/inventory/raw-materials");
    return { success: true, id };
  } catch {
    return { success: false, error: "Category not found." };
  }
}

export async function setProductCategoryActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.productCategory.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/setup/categories");
    revalidatePath("/products");
    return { success: true, id };
  } catch {
    return { success: false, error: "Category not found." };
  }
}

export async function setAssetTypeActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.assetType.update({ where: { id }, data: { isActive } });
    revalidatePath("/setup/categories");
    return { success: true, id };
  } catch {
    return { success: false, error: "Type not found." };
  }
}
