/**
 * Minimal bootstrap only — no demo products, materials, or sales.
 * Creates roles, HQ warehouse, admin login, and default settings.
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      const msg = error instanceof Error ? error.message : String(error);
      const unreachable =
        msg.includes("Can't reach database server") ||
        msg.includes("P1001") ||
        msg.includes("Timed out");
      if (!unreachable || i === attempts) throw error;
      const waitMs = i * 2000;
      console.warn(`${label}: DB unreachable (attempt ${i}/${attempts}), retrying in ${waitMs}ms…`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw last;
}

async function main() {
  // Wake Neon / confirm connectivity before writes
  await withRetry("seed connect", () => prisma.$queryRaw`SELECT 1`);

  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: { description: "Central control — products, all shops, stock, sales import, finance" },
    create: {
      name: "Admin",
      description: "Central control — products, all shops, stock, sales import, finance",
    },
  });

  const shopRole = await prisma.role.upsert({
    where: { name: "Shop" },
    update: {
      description:
        "Shop portal — own stock, restock, import external sales, finance",
    },
    create: {
      name: "Shop",
      description:
        "Shop portal — own stock, restock, import external sales, finance",
    },
  });

  await prisma.role.upsert({
    where: { name: "Manager" },
    update: { description: "Like Admin — central inventory control" },
    create: {
      name: "Manager",
      description: "Like Admin — central inventory control",
    },
  });

  // Fixed garment categories
  for (const name of ["Male", "Ladies", "Kids"] as const) {
    await prisma.productCategory.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  await prisma.productCategory.updateMany({
    where: { name: { notIn: ["Male", "Ladies", "Kids"] } },
    data: { isActive: false },
  });

  const mainBranch = await prisma.branch.upsert({
    where: { code: "HQ" },
    update: {
      name: "Head Office / Warehouse",
      isWarehouse: true,
      isShop: false,
      isActive: true,
    },
    create: {
      name: "Head Office / Warehouse",
      code: "HQ",
      address: "",
      isWarehouse: true,
      isShop: false,
    },
  });

  // Starter shop branch (empty stock) so you can attach a Shop user
  await prisma.branch.upsert({
    where: { code: "SHOP1" },
    update: {
      name: "Retail Shop 1",
      isWarehouse: false,
      isShop: true,
      isActive: true,
    },
    create: {
      name: "Retail Shop 1",
      code: "SHOP1",
      address: "",
      isWarehouse: false,
      isShop: true,
    },
  });

  const passwordHash = await hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
      isActive: true,
      name: "Admin",
      username: "admin",
    },
    create: {
      email: "admin@example.com",
      username: "admin",
      name: "Admin",
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
    },
  });

  // Backfill usernames for any users still missing one
  const missing = await prisma.user.findMany({ where: { username: null } });
  for (const u of missing) {
    const base = u.email.split("@")[0]?.replace(/[^a-zA-Z0-9._-]/g, "") || "user";
    let candidate = base.toLowerCase().slice(0, 28);
    let n = 0;
    while (
      await prisma.user.findFirst({
        where: { username: candidate, NOT: { id: u.id } },
      })
    ) {
      n += 1;
      candidate = `${base.slice(0, 24)}${n}`;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { username: candidate },
    });
  }

  void shopRole;

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      companyName: "Esset Inventory",
      companyTagline: "Ethiopia",
    },
    create: {
      id: "default",
      companyName: "Esset Inventory",
      companyTagline: "Ethiopia",
      currencyCode: "ETB",
      locale: "en-ET",
      largeStockOutThreshold: new Prisma.Decimal("50"),
      requirePriceOverrideApproval: false,
      defaultOverheadPercent: new Prisma.Decimal("10"),
      defaultMarginPercent: new Prisma.Decimal("30"),
      defaultFinishedGoodsReorderAt: 5,
      payrollDaysPerMonth: 30,
    },
  });

  console.log("Minimal seed complete.");
  console.log("");
  console.log("Login:  admin / admin123  (or admin@example.com)");
  console.log("Roles:  Admin / Manager (HQ) · Shop (unique username + password)");
  console.log("Create shops under Shops → Initiate (with shop login).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
