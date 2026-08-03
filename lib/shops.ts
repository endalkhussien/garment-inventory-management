import { prisma } from "@/lib/prisma";

/** Suggest next SHOP2, SHOP3… from existing shop codes (read-only helper). */
export async function suggestNextShopCode(): Promise<string> {
  const shops = await prisma.branch.findMany({
    where: { isShop: true },
    select: { code: true },
  });
  let max = 0;
  for (const s of shops) {
    const m = /^SHOP(\d+)$/i.exec(s.code);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `SHOP${max + 1}`;
}
