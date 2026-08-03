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

  const shopRole = await prisma.role.upsert({
    where: { name: "Shop" },
    update: { description: "Retail shop — POS, own stock, order from warehouse, finance" },
    create: {
      name: "Shop",
      description: "Retail shop — POS, own stock, order from warehouse, finance",
    },
  });

  await prisma.role.upsert({
    where: { name: "Manager" },
    update: { description: "Like Admin — can fulfill shop stock orders" },
    create: {
      name: "Manager",
      description: "Like Admin — can fulfill shop stock orders",
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
    },
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
    },
  });

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
  console.log("Login:  admin@example.com / admin123");
  console.log("Roles:  Admin / Manager (HQ) · Shop (assign to a shop branch)");
  console.log("Branches: HQ warehouse + SHOP1 (empty) — edit names under Branches.");
  console.log("Create Shop users under Users & roles and link them to SHOP1.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
