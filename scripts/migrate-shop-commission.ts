/**
 * One-off: move legacy shop commission % from pieceRatePerUnit → commissionPercent.
 * Safe to re-run (only migrates when pct is 0 and old rate > 0).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shopStaff = await prisma.employee.findMany({
    where: { branch: { isShop: true } },
    select: {
      id: true,
      name: true,
      pieceRatePerUnit: true,
      commissionPercent: true,
      commissionMode: true,
    },
  });

  console.log("Shop staff count:", shopStaff.length);
  let migrated = 0;

  for (const e of shopStaff) {
    const oldRate = Number(e.pieceRatePerUnit);
    const pct = Number(e.commissionPercent);
    if (
      oldRate > 0 &&
      pct === 0 &&
      e.commissionMode === "PERCENT_OF_REVENUE"
    ) {
      await prisma.employee.update({
        where: { id: e.id },
        data: {
          commissionPercent: e.pieceRatePerUnit,
          pieceRatePerUnit: 0,
          commissionMode: "PERCENT_OF_REVENUE",
        },
      });
      migrated++;
      console.log(`Migrated ${e.name}: ${oldRate}% → commissionPercent`);
    }
  }

  console.log("Migrated", migrated, "staff");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
