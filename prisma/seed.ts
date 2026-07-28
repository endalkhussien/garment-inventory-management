import { hash } from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: { description: "HQ — full inventory, production, all shops" },
    create: {
      name: "Admin",
      description: "HQ — full inventory, production, all shops",
    },
  });

  const shopRole = await prisma.role.upsert({
    where: { name: "Shop" },
    update: { description: "Retail shop — POS and own shop stock only" },
    create: {
      name: "Shop",
      description: "Retail shop — POS and own shop stock only",
    },
  });

  // Keep Manager as admin-equivalent for existing logins
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
      address: "Addis Ababa, Ethiopia",
      isWarehouse: true,
      isShop: false,
    },
  });

  const shopBranch = await prisma.branch.upsert({
    where: { code: "SHOP1" },
    update: {
      name: "Bole Retail Shop",
      isWarehouse: false,
      isShop: true,
      isActive: true,
    },
    create: {
      name: "Bole Retail Shop",
      code: "SHOP1",
      address: "Bole, Addis Ababa",
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
      name: "Factory Admin",
    },
    create: {
      email: "admin@example.com",
      name: "Factory Admin",
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "shop@example.com" },
    update: {
      passwordHash,
      roleId: shopRole.id,
      branchId: shopBranch.id,
      isActive: true,
      name: "Bole Shop Cashier",
    },
    create: {
      email: "shop@example.com",
      name: "Bole Shop Cashier",
      passwordHash,
      roleId: shopRole.id,
      branchId: shopBranch.id,
    },
  });

  const catYarn = await prisma.materialCategory.upsert({
    where: { name: "Yarn" },
    update: {},
    create: { name: "Yarn", description: "Knitting / weaving yarn" },
  });
  const catThread = await prisma.materialCategory.upsert({
    where: { name: "Thread" },
    update: {},
    create: { name: "Thread" },
  });
  const catButtons = await prisma.materialCategory.upsert({
    where: { name: "Buttons" },
    update: {},
    create: { name: "Buttons" },
  });

  const prodKnit = await prisma.productCategory.upsert({
    where: { name: "Knitwear" },
    update: {},
    create: { name: "Knitwear" },
  });

  const typeSewing = await prisma.assetType.upsert({
    where: { name: "Sewing machine" },
    update: {},
    create: { name: "Sewing machine" },
  });
  const typeOverlock = await prisma.assetType.upsert({
    where: { name: "Overlock machine" },
    update: {},
    create: { name: "Overlock machine" },
  });

  const yarnSupplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-yarn" },
    update: { name: "Addis Yarn Traders", isActive: true },
    create: {
      id: "seed-supplier-yarn",
      name: "Addis Yarn Traders",
      contactName: "Abebe Kebede",
      phone: "+251911000111",
      address: "Merkato, Addis Ababa",
    },
  });

  const trimSupplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-trim" },
    update: { name: "Horn of Africa Trims", isActive: true },
    create: {
      id: "seed-supplier-trim",
      name: "Horn of Africa Trims",
      contactName: "Sara Hailu",
      phone: "+251922000222",
      address: "Bole, Addis Ababa",
    },
  });

  await prisma.rawMaterial.upsert({
    where: { id: "seed-rm-cotton-yarn" },
    update: {
      name: "Cotton yarn 30/1",
      categoryId: catYarn.id,
      unitOfMeasure: "kg",
      supplierId: yarnSupplier.id,
      costPerUnit: new Prisma.Decimal("420.00"),
      reorderThreshold: new Prisma.Decimal("50"),
      quantity: new Prisma.Decimal("120"),
      location: "Warehouse A / Bin 12",
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      id: "seed-rm-cotton-yarn",
      name: "Cotton yarn 30/1",
      categoryId: catYarn.id,
      unitOfMeasure: "kg",
      supplierId: yarnSupplier.id,
      costPerUnit: new Prisma.Decimal("420.00"),
      reorderThreshold: new Prisma.Decimal("50"),
      quantity: new Prisma.Decimal("120"),
      location: "Warehouse A / Bin 12",
      branchId: mainBranch.id,
    },
  });

  await prisma.rawMaterial.upsert({
    where: { id: "seed-rm-poly-thread" },
    update: {
      name: "Polyester sewing thread",
      categoryId: catThread.id,
      unitOfMeasure: "cone",
      supplierId: trimSupplier.id,
      costPerUnit: new Prisma.Decimal("85.50"),
      reorderThreshold: new Prisma.Decimal("40"),
      quantity: new Prisma.Decimal("28"),
      location: "Warehouse A / Shelf 4",
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      id: "seed-rm-poly-thread",
      name: "Polyester sewing thread",
      categoryId: catThread.id,
      unitOfMeasure: "cone",
      supplierId: trimSupplier.id,
      costPerUnit: new Prisma.Decimal("85.50"),
      reorderThreshold: new Prisma.Decimal("40"),
      quantity: new Prisma.Decimal("28"),
      location: "Warehouse A / Shelf 4",
      branchId: mainBranch.id,
    },
  });

  await prisma.rawMaterial.upsert({
    where: { id: "seed-rm-buttons" },
    update: {
      name: "Shirt buttons 18L",
      categoryId: catButtons.id,
      unitOfMeasure: "gross",
      supplierId: trimSupplier.id,
      costPerUnit: new Prisma.Decimal("65.00"),
      reorderThreshold: new Prisma.Decimal("20"),
      quantity: new Prisma.Decimal("15"),
      location: "Trim room / Drawer B",
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      id: "seed-rm-buttons",
      name: "Shirt buttons 18L",
      categoryId: catButtons.id,
      unitOfMeasure: "gross",
      supplierId: trimSupplier.id,
      costPerUnit: new Prisma.Decimal("65.00"),
      reorderThreshold: new Prisma.Decimal("20"),
      quantity: new Prisma.Decimal("15"),
      location: "Trim room / Drawer B",
      branchId: mainBranch.id,
    },
  });

  await prisma.capitalAsset.upsert({
    where: { id: "seed-asset-juki" },
    update: {
      name: "Juki DDL-8700",
      typeId: typeSewing.id,
      typeName: typeSewing.name,
      serialNumber: "JUKI-8700-001",
      purchaseCost: new Prisma.Decimal("48500.00"),
      condition: "GOOD",
      location: "Line 1",
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      id: "seed-asset-juki",
      name: "Juki DDL-8700",
      typeId: typeSewing.id,
      typeName: typeSewing.name,
      serialNumber: "JUKI-8700-001",
      purchaseDate: new Date("2024-03-15"),
      purchaseCost: new Prisma.Decimal("48500.00"),
      condition: "GOOD",
      location: "Line 1",
      branchId: mainBranch.id,
    },
  });

  await prisma.capitalAsset.upsert({
    where: { id: "seed-asset-overlock" },
    update: {
      name: "Brother 1034D Overlock",
      typeId: typeOverlock.id,
      typeName: typeOverlock.name,
      serialNumber: "BRO-1034D-014",
      purchaseCost: new Prisma.Decimal("31200.00"),
      condition: "FAIR",
      location: "Finishing",
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      id: "seed-asset-overlock",
      name: "Brother 1034D Overlock",
      typeId: typeOverlock.id,
      typeName: typeOverlock.name,
      serialNumber: "BRO-1034D-014",
      purchaseDate: new Date("2023-11-02"),
      purchaseCost: new Prisma.Decimal("31200.00"),
      condition: "FAIR",
      location: "Finishing",
      branchId: mainBranch.id,
    },
  });

  const sweater = await prisma.product.upsert({
    where: { id: "seed-product-crew-neck" },
    update: {
      name: "Men's Crew Neck Sweater",
      categoryId: prodKnit.id,
      description: "Classic crew neck for domestic retail",
      isActive: true,
    },
    create: {
      id: "seed-product-crew-neck",
      name: "Men's Crew Neck Sweater",
      categoryId: prodKnit.id,
      description: "Classic crew neck for domestic retail",
    },
  });

  const materialCost = new Prisma.Decimal("191.96");
  const laborCost = new Prisma.Decimal("120.00");
  const overheadPercent = new Prisma.Decimal("10.00");
  const totalCost = new Prisma.Decimal("343.16");
  const sellingPrice = new Prisma.Decimal("446.11");

  const variantM = await prisma.productVariant.upsert({
    where: { id: "seed-variant-crew-m-navy" },
    update: {
      productId: sweater.id,
      size: "M",
      color: "Navy",
      sku: "MCS-M-NAVY",
      laborCostPerUnit: laborCost,
      overheadPercent,
      sellingPrice,
      materialCostCached: materialCost,
      totalCostCached: totalCost,
      costIsStale: false,
      isActive: true,
    },
    create: {
      id: "seed-variant-crew-m-navy",
      productId: sweater.id,
      size: "M",
      color: "Navy",
      sku: "MCS-M-NAVY",
      laborCostPerUnit: laborCost,
      overheadPercent,
      sellingPrice,
      materialCostCached: materialCost,
      totalCostCached: totalCost,
    },
  });

  await prisma.productVariant.upsert({
    where: { id: "seed-variant-crew-l-navy" },
    update: {
      productId: sweater.id,
      size: "L",
      color: "Navy",
      sku: "MCS-L-NAVY",
      laborCostPerUnit: laborCost,
      overheadPercent,
      sellingPrice,
      materialCostCached: materialCost,
      totalCostCached: totalCost,
      costIsStale: false,
      isActive: true,
    },
    create: {
      id: "seed-variant-crew-l-navy",
      productId: sweater.id,
      size: "L",
      color: "Navy",
      sku: "MCS-L-NAVY",
      laborCostPerUnit: laborCost,
      overheadPercent,
      sellingPrice,
      materialCostCached: materialCost,
      totalCostCached: totalCost,
    },
  });

  const bomSpecs = [
    {
      id: "seed-bom-crew-yarn",
      rawMaterialId: "seed-rm-cotton-yarn",
      quantityPerUnit: "0.4500",
    },
    {
      id: "seed-bom-crew-thread",
      rawMaterialId: "seed-rm-poly-thread",
      quantityPerUnit: "0.0200",
    },
    {
      id: "seed-bom-crew-buttons",
      rawMaterialId: "seed-rm-buttons",
      quantityPerUnit: "0.0500",
    },
  ] as const;

  for (const line of bomSpecs) {
    await prisma.billOfMaterial.upsert({
      where: { id: line.id },
      update: {
        variantId: variantM.id,
        rawMaterialId: line.rawMaterialId,
        quantityPerUnit: new Prisma.Decimal(line.quantityPerUnit),
      },
      create: {
        id: line.id,
        variantId: variantM.id,
        rawMaterialId: line.rawMaterialId,
        quantityPerUnit: new Prisma.Decimal(line.quantityPerUnit),
      },
    });
  }

  await prisma.employee.upsert({
    where: { id: "seed-emp-hana" },
    update: {
      name: "Hana Bekele",
      code: "E-01",
      branchId: mainBranch.id,
      isActive: true,
      monthlyBaseSalary: new Prisma.Decimal("8500"),
      pieceRatePerUnit: new Prisma.Decimal("12.5"),
    },
    create: {
      id: "seed-emp-hana",
      name: "Hana Bekele",
      code: "E-01",
      branchId: mainBranch.id,
      monthlyBaseSalary: new Prisma.Decimal("8500"),
      pieceRatePerUnit: new Prisma.Decimal("12.5"),
    },
  });

  await prisma.employee.upsert({
    where: { id: "seed-emp-dawit" },
    update: {
      name: "Dawit Alemu",
      code: "E-02",
      branchId: mainBranch.id,
      isActive: true,
      monthlyBaseSalary: new Prisma.Decimal("7500"),
      pieceRatePerUnit: new Prisma.Decimal("10"),
    },
    create: {
      id: "seed-emp-dawit",
      name: "Dawit Alemu",
      code: "E-02",
      branchId: mainBranch.id,
      monthlyBaseSalary: new Prisma.Decimal("7500"),
      pieceRatePerUnit: new Prisma.Decimal("10"),
    },
  });

  await prisma.customer.upsert({
    where: { id: "seed-customer-walkin" },
    update: { name: "Walk-in customer", isWalkIn: true },
    create: {
      id: "seed-customer-walkin",
      name: "Walk-in customer",
      isWalkIn: true,
    },
  });

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      largeStockOutThreshold: new Prisma.Decimal("50"),
      requirePriceOverrideApproval: false,
    },
  });

  console.log("Seed complete.");
  console.log("Admin: admin@example.com / admin123  (HQ — everything)");
  console.log("Shop:  shop@example.com / admin123   (Bole POS only)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
