/**
 * Minimal bootstrap only — no demo products, materials, or sales.
 * Creates roles, HQ warehouse, admin login, and default settings.
 */
import { hash } from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: { description: "Full access — inventory, production, shops, users" },
    create: {
      name: "Admin",
      description: "Full access — inventory, production, shops, users",
    },
  });

  await prisma.role.upsert({
    where: { name: "Shop" },
    update: { description: "Retail shop — POS and own shop stock only" },
    create: {
      name: "Shop",
      description: "Retail shop — POS and own shop stock only",
    },
  });

  await prisma.role.upsert({
    where: { name: "Manager" },
    update: { description: "Treated like Admin for access" },
    create: {
      name: "Manager",
      description: "Treated like Admin for access",
    },
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

  const passwordHash = await hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
      isActive: true,
      name: "Admin",
    },
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
    },
  });

  // Remove demo shop user if it still exists
  await prisma.user.deleteMany({
    where: { email: "shop@example.com" },
  });

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
  console.log("Login:  admin@example.com / admin123");
  console.log("Then create: branches, categories, materials, products, users.");
  console.log("Change the admin password after first login (Users).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
