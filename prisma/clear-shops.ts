/**
 * Delete all retail shops and related data.
 * Keeps: HQ, admin user, roles, products, settings.
 *
 * Run: npm run db:clear-shops
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.branch.findMany({
    where: { isShop: true },
    select: { id: true, name: true, code: true },
  });

  if (shops.length === 0) {
    console.log("No shops to clear.");
    return;
  }

  console.log(
    `Clearing ${shops.length} shop(s):`,
    shops.map((s) => s.code).join(", "),
  );

  const shopIds = shops.map((s) => s.id);

  await prisma.$transaction(async (tx) => {
    const saleIds = (
      await tx.sale.findMany({
        where: { branchId: { in: shopIds } },
        select: { id: true },
      })
    ).map((s) => s.id);

    if (saleIds.length) {
      await tx.payment.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
    }

    await tx.expense.deleteMany({ where: { branchId: { in: shopIds } } });
    await tx.finishedGoodsMovement.deleteMany({
      where: { branchId: { in: shopIds } },
    });
    await tx.finishedGoodsStock.deleteMany({
      where: { branchId: { in: shopIds } },
    });

    const orderIds = (
      await tx.shopStockOrder.findMany({
        where: {
          OR: [
            { shopBranchId: { in: shopIds } },
            { warehouseBranchId: { in: shopIds } },
          ],
        },
        select: { id: true },
      })
    ).map((o) => o.id);
    if (orderIds.length) {
      await tx.shopStockOrderLine.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await tx.shopStockOrder.deleteMany({ where: { id: { in: orderIds } } });
    }

    await tx.stockTransfer.deleteMany({
      where: {
        OR: [
          { fromBranchId: { in: shopIds } },
          { toBranchId: { in: shopIds } },
        ],
      },
    });

    await tx.employee.deleteMany({ where: { branchId: { in: shopIds } } });
    await tx.user.deleteMany({ where: { branchId: { in: shopIds } } });
    await tx.branch.deleteMany({ where: { id: { in: shopIds } } });
  });

  console.log("Done. Create shops again from Manage shops → New shop.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
