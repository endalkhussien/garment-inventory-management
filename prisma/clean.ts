/**
 * Wipe sample / transactional data so you can enter real factory data.
 * Keeps: roles, AppSetting, HQ warehouse branch, admin@example.com
 *
 * Run: npm run db:clean
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning sample and transactional data...");

  // Child / transactional tables first
  await prisma.payrollLine.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.shopStockOrderLine.deleteMany();
  await prisma.shopStockOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.finishedGoodsStock.deleteMany();
  await prisma.productionWastage.deleteMany();
  await prisma.productionOutput.deleteMany();
  await prisma.materialLot.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.billOfMaterial.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.stocktakeLine.deleteMany();
  await prisma.stocktakeSession.deleteMany();
  await prisma.rawMaterialTransfer.deleteMany();
  await prisma.rawMaterialStock.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.capitalAsset.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.materialCategory.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.assetType.deleteMany();

  // Users except admin
  await prisma.user.deleteMany({
    where: { email: { not: "admin@example.com" } },
  });

  // Branches except HQ
  await prisma.branch.deleteMany({
    where: { code: { not: "HQ" } },
  });

  console.log("Done. Kept: roles, HQ branch (if present), admin user, settings.");
  console.log("Next: npm run db:seed   (minimal bootstrap only)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
