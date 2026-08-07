import { prisma } from "@/lib/prisma";
import {
  addReadmeSheet,
  addSheet,
  createWorkbook,
  formatExportDate,
  writeWorkbookBuffer,
} from "@/lib/export/workbook";

/**
 * Restock template: one row per active product variant (as created in catalog).
 * User fills the quantity column, then uploads the file on Restock → Import.
 *
 * Import columns used by the parser: code (or sku) + quantity.
 * Extra columns (name, size, color…) are for guidance only.
 */
export async function buildRestockTemplateWorkbook(): Promise<{
  buffer: Buffer;
  filename: string;
  rowCount: number;
}> {
  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      product: { isActive: true },
    },
    include: {
      product: {
        include: { category: true },
      },
    },
    orderBy: [
      { product: { name: "asc" } },
      { size: "asc" },
      { color: "asc" },
    ],
  });

  const workbook = createWorkbook();

  addReadmeSheet(workbook, [
    [
      "Purpose",
      "Fill quantity for each product row (as created in the catalog), then upload on Restock → Import from template",
    ],
    [
      "How to use",
      "1) Do not rename headers. 2) Fill only the quantity column. 3) Blank or 0 = skip that product. 4) Save and upload .xlsx/.csv",
    ],
    [
      "code column",
      "SKU for that size/color (unique). Import matches this code. Do not change it.",
    ],
    [
      "product_code column",
      "Catalog product code (for reference only)",
    ],
    [
      "quantity column",
      "Whole numbers only (units to add). Rows with blank or 0 are skipped.",
    ],
    ["Generated", new Date().toISOString()],
    ["Product lines", String(variants.length)],
  ]);

  // `code` = SKU so multi size/color rows restock the correct variant.
  const headers = [
    "code",
    "product_code",
    "product_name",
    "size",
    "color",
    "category",
    "quantity",
  ];

  const rows =
    variants.length > 0
      ? variants.map((v) => ({
          code: v.sku,
          product_code: v.product.code ?? "",
          product_name: v.product.name,
          size: v.size,
          color: v.color,
          category: v.product.category?.name ?? "",
          // Blank for user entry (parser skips empty / 0)
          quantity: "" as const,
        }))
      : [
          {
            code: "MCS-001-M-BLACK",
            product_code: "MCS-001",
            product_name: "Example product (create real products first)",
            size: "M",
            color: "Black",
            category: "Male",
            quantity: "" as const,
          },
        ];
  addSheet(workbook, "Restock", headers, rows);

  const day = formatExportDate(new Date());
  return {
    buffer: writeWorkbookBuffer(workbook),
    filename: `esset-restock-template-${day}.xlsx`,
    rowCount: variants.length,
  };
}
