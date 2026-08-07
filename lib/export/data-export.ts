import type { Prisma } from "@prisma/client";

import {
  addReadmeSheet,
  addSheet,
  createWorkbook,
  exportFilename,
  formatExportDate,
  formatExportDateTime,
  moneyNumber,
  qtyNumber,
  writeWorkbookBuffer,
  yesNo,
} from "@/lib/export/workbook";
import { prisma } from "@/lib/prisma";

export type DataExportOptions = {
  /** When set, scope branch-bound data to this shop/branch. Null/undefined = all (admin). */
  branchId?: string | null;
  salesFrom?: Date | null;
  salesTo?: Date | null;
  /** Admin sees catalogue-wide + HQ sheets; shop role is retail-scoped. */
  isAdmin: boolean;
  exportedBy: string;
  scopeLabel: string;
};

export type DataExportResult = {
  buffer: Buffer;
  filename: string;
  sheetNames: string[];
};

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function paymentMethodsLabel(
  payments: Array<{ method: string; amount: { toString(): string } | number }>,
): string {
  if (!payments.length) return "";
  return payments
    .map((p) => `${p.method}: ${moneyNumber(p.amount).toFixed(2)}`)
    .join("; ");
}

function itemsSummary(
  items: Array<{
    quantity: number;
    variant: { sku: string; product: { name: string }; size: string; color: string };
  }>,
): string {
  if (!items.length) return "";
  return items
    .map(
      (i) =>
        `${i.quantity}× ${i.variant.product.name} (${i.variant.size}/${i.variant.color})`,
    )
    .join("; ");
}

/**
 * Build a professional multi-sheet Excel workbook for data recovery / backup.
 * No auth secrets; efficient batched queries.
 */
export async function buildDataExport(
  options: DataExportOptions,
): Promise<DataExportResult> {
  const branchId = options.branchId || null;
  const salesWhere: Prisma.SaleWhereInput = {};
  if (branchId) salesWhere.branchId = branchId;
  if (options.salesFrom || options.salesTo) {
    salesWhere.createdAt = {};
    if (options.salesFrom) {
      salesWhere.createdAt.gte = startOfDay(options.salesFrom);
    }
    if (options.salesTo) {
      salesWhere.createdAt.lte = endOfDay(options.salesTo);
    }
  }

  const stockWhere: Prisma.FinishedGoodsStockWhereInput = branchId
    ? { branchId }
    : { branch: { isShop: true } };

  const employeeWhere: Prisma.EmployeeWhereInput = branchId
    ? { branchId }
    : {};

  const expenseWhere: Prisma.ExpenseWhereInput = {};
  if (branchId) expenseWhere.branchId = branchId;
  if (options.salesFrom || options.salesTo) {
    expenseWhere.expenseDate = {};
    if (options.salesFrom) {
      expenseWhere.expenseDate.gte = startOfDay(options.salesFrom);
    }
    if (options.salesTo) {
      expenseWhere.expenseDate.lte = endOfDay(options.salesTo);
    }
  }

  const transferWhere: Prisma.StockTransferWhereInput = branchId
    ? { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] }
    : {};

  const [
    products,
    shopStock,
    sales,
    staff,
    expenses,
    customers,
    branches,
    rawMaterials,
    transfers,
  ] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        variants: {
          orderBy: [{ size: "asc" }, { color: "asc" }],
        },
      },
      orderBy: [{ productNo: "asc" }, { name: "asc" }],
    }),
    prisma.finishedGoodsStock.findMany({
      where: stockWhere,
      include: {
        branch: { select: { name: true, code: true } },
        variant: {
          include: {
            product: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: [{ branch: { name: "asc" } }, { updatedAt: "desc" }],
    }),
    prisma.sale.findMany({
      where: salesWhere,
      include: {
        branch: { select: { name: true, code: true } },
        customer: { select: { name: true, isWalkIn: true } },
        soldBy: { select: { name: true, username: true } },
        payments: true,
        items: {
          include: {
            variant: {
              include: {
                product: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: employeeWhere,
      include: {
        branch: { select: { name: true, code: true, isShop: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      include: {
        branch: { select: { name: true, code: true } },
        createdBy: { select: { name: true, username: true } },
      },
      orderBy: { expenseDate: "desc" },
    }),
    options.isAdmin
      ? prisma.customer.findMany({
          where: { isWalkIn: false },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    options.isAdmin
      ? prisma.branch.findMany({
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    options.isAdmin
      ? prisma.rawMaterial.findMany({
          include: {
            category: { select: { name: true } },
            supplier: { select: { name: true } },
            branch: { select: { name: true, code: true } },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.stockTransfer.findMany({
      where: transferWhere,
      include: {
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } },
        variant: {
          include: {
            product: { select: { name: true, code: true } },
          },
        },
        transferredBy: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const wb = createWorkbook();
  const sheetNames: string[] = [];

  const salesFromLabel = options.salesFrom
    ? formatExportDate(options.salesFrom)
    : "All time";
  const salesToLabel = options.salesTo
    ? formatExportDate(options.salesTo)
    : "Present";

  addReadmeSheet(wb, [
    ["Export", "Esset Inventory — data recovery workbook"],
    ["Generated at (Africa/Addis_Ababa)", formatExportDateTime(new Date())],
    ["Exported by", options.exportedBy],
    ["Scope", options.scopeLabel],
    ["Sales / expenses date range", `${salesFromLabel} → ${salesToLabel}`],
    ["Currency", "ETB (columns marked (ETB) are numeric amounts)"],
    [
      "Sheets",
      "Products, Shop stock, Sales, Sale items, Payments, Staff, Expenses, Transfers" +
        (options.isAdmin
          ? ", Branches, Customers, Raw materials"
          : " (shop-scoped)"),
    ],
    [
      "Security",
      "Passwords, auth tokens, and user hashes are never included.",
    ],
    [
      "Empty sheets",
      "Headers remain so the structure is clear even with no rows.",
    ],
  ]);
  sheetNames.push("README");

  if (options.isAdmin) {
    const branchHeaders = [
      "Name",
      "Code",
      "Address",
      "Is shop",
      "Is warehouse",
      "Active",
      "Created at",
    ];
    addSheet(
      wb,
      "Branches",
      branchHeaders,
      branches.map((b) => ({
        Name: b.name,
        Code: b.code,
        Address: b.address ?? "",
        "Is shop": yesNo(b.isShop),
        "Is warehouse": yesNo(b.isWarehouse),
        Active: yesNo(b.isActive),
        "Created at": formatExportDateTime(b.createdAt),
      })),
    );
    sheetNames.push("Branches");
  }

  const productHeaders = [
    "Product no",
    "Product code",
    "Product name",
    "Category",
    "Size",
    "Color",
    "SKU",
    "Buying price (ETB)",
    "Selling price (ETB)",
    "Labor cost (ETB)",
    "Total cost (ETB)",
    "Variant active",
    "Product active",
  ];
  const productRows: Array<Record<string, string | number>> = [];
  for (const p of products) {
    if (!p.variants.length) {
      productRows.push({
        "Product no": p.productNo ?? "",
        "Product code": p.code ?? "",
        "Product name": p.name,
        Category: p.category?.name ?? "",
        Size: "",
        Color: "",
        SKU: "",
        "Buying price (ETB)": "",
        "Selling price (ETB)": "",
        "Labor cost (ETB)": "",
        "Total cost (ETB)": "",
        "Variant active": "",
        "Product active": yesNo(p.isActive),
      });
      continue;
    }
    for (const v of p.variants) {
      productRows.push({
        "Product no": p.productNo ?? "",
        "Product code": p.code ?? "",
        "Product name": p.name,
        Category: p.category?.name ?? "",
        Size: v.size,
        Color: v.color,
        SKU: v.sku,
        "Buying price (ETB)": moneyNumber(v.buyingPrice),
        "Selling price (ETB)": moneyNumber(v.sellingPrice),
        "Labor cost (ETB)": moneyNumber(v.laborCostPerUnit),
        "Total cost (ETB)": moneyNumber(v.totalCostCached),
        "Variant active": yesNo(v.isActive),
        "Product active": yesNo(p.isActive),
      });
    }
  }
  addSheet(wb, "Products", productHeaders, productRows);
  sheetNames.push("Products");

  const stockHeaders = [
    "Shop",
    "Shop code",
    "Product",
    "Product code",
    "Size",
    "Color",
    "SKU",
    "Quantity",
    "Reorder at",
    "Updated at",
  ];
  addSheet(
    wb,
    "Shop stock",
    stockHeaders,
    shopStock.map((s) => ({
      Shop: s.branch.name,
      "Shop code": s.branch.code,
      Product: s.variant.product.name,
      "Product code": s.variant.product.code ?? "",
      Size: s.variant.size,
      Color: s.variant.color,
      SKU: s.variant.sku,
      Quantity: s.quantity,
      "Reorder at": s.reorderAt,
      "Updated at": formatExportDateTime(s.updatedAt),
    })),
  );
  sheetNames.push("Shop stock");

  const salesHeaders = [
    "Receipt",
    "Date",
    "Shop",
    "Shop code",
    "Customer",
    "Items summary",
    "Subtotal (ETB)",
    "Total (ETB)",
    "Payment method",
    "Is return",
    "Return reason",
    "Sold by",
  ];
  addSheet(
    wb,
    "Sales",
    salesHeaders,
    sales.map((s) => ({
      Receipt: s.receiptNumber,
      Date: formatExportDateTime(s.createdAt),
      Shop: s.branch.name,
      "Shop code": s.branch.code,
      Customer: s.customer?.isWalkIn
        ? "Walk-in"
        : (s.customer?.name ?? "Walk-in"),
      "Items summary": itemsSummary(s.items),
      "Subtotal (ETB)": moneyNumber(s.subtotal),
      "Total (ETB)": moneyNumber(s.total),
      "Payment method": paymentMethodsLabel(s.payments),
      "Is return": yesNo(s.isReturn),
      "Return reason": s.returnReason ?? "",
      "Sold by": s.soldBy?.name || s.soldBy?.username || "",
    })),
  );
  sheetNames.push("Sales");

  const saleItemHeaders = [
    "Receipt",
    "Date",
    "Shop",
    "Product",
    "Product code",
    "Size",
    "Color",
    "SKU",
    "Quantity",
    "Unit price (ETB)",
    "Line total (ETB)",
  ];
  const saleItemRows: Array<Record<string, string | number>> = [];
  for (const s of sales) {
    for (const item of s.items) {
      saleItemRows.push({
        Receipt: s.receiptNumber,
        Date: formatExportDateTime(s.createdAt),
        Shop: s.branch.name,
        Product: item.variant.product.name,
        "Product code": item.variant.product.code ?? "",
        Size: item.variant.size,
        Color: item.variant.color,
        SKU: item.variant.sku,
        Quantity: item.quantity,
        "Unit price (ETB)": moneyNumber(item.unitPrice),
        "Line total (ETB)": moneyNumber(item.lineTotal),
      });
    }
  }
  addSheet(wb, "Sale items", saleItemHeaders, saleItemRows);
  sheetNames.push("Sale items");

  const paymentHeaders = [
    "Receipt",
    "Date",
    "Shop",
    "Method",
    "Amount (ETB)",
  ];
  const paymentRows: Array<Record<string, string | number>> = [];
  for (const s of sales) {
    for (const p of s.payments) {
      paymentRows.push({
        Receipt: s.receiptNumber,
        Date: formatExportDateTime(p.createdAt),
        Shop: s.branch.name,
        Method: p.method,
        "Amount (ETB)": moneyNumber(p.amount),
      });
    }
  }
  addSheet(wb, "Payments", paymentHeaders, paymentRows);
  sheetNames.push("Payments");

  const staffHeaders = [
    "Name",
    "Code",
    "Phone",
    "Job title",
    "Shop",
    "Shop code",
    "Monthly salary (ETB)",
    "Commission mode",
    "Piece rate (ETB)",
    "Commission %",
    "Hire date",
    "Active",
  ];
  addSheet(
    wb,
    "Staff",
    staffHeaders,
    staff.map((e) => ({
      Name: e.name,
      Code: e.code ?? "",
      Phone: e.phone ?? "",
      "Job title": e.jobTitle ?? "",
      Shop: e.branch?.name ?? "",
      "Shop code": e.branch?.code ?? "",
      "Monthly salary (ETB)": moneyNumber(e.monthlyBaseSalary),
      "Commission mode": e.commissionMode,
      "Piece rate (ETB)": moneyNumber(e.pieceRatePerUnit),
      "Commission %": qtyNumber(e.commissionPercent),
      "Hire date": e.hireDate ? formatExportDate(e.hireDate) : "",
      Active: yesNo(e.isActive),
    })),
  );
  sheetNames.push("Staff");

  const expenseHeaders = [
    "Date",
    "Shop",
    "Shop code",
    "Category",
    "Title",
    "Amount (ETB)",
    "Note",
    "Recorded by",
  ];
  addSheet(
    wb,
    "Expenses",
    expenseHeaders,
    expenses.map((e) => ({
      Date: formatExportDate(e.expenseDate),
      Shop: e.branch.name,
      "Shop code": e.branch.code,
      Category: e.category,
      Title: e.title,
      "Amount (ETB)": moneyNumber(e.amount),
      Note: e.note ?? "",
      "Recorded by": e.createdBy?.name || e.createdBy?.username || "",
    })),
  );
  sheetNames.push("Expenses");

  const transferHeaders = [
    "Date",
    "From shop",
    "To shop",
    "Product",
    "Product code",
    "Size",
    "Color",
    "SKU",
    "Quantity",
    "Note",
    "Transferred by",
  ];
  addSheet(
    wb,
    "Transfers",
    transferHeaders,
    transfers.map((t) => ({
      Date: formatExportDateTime(t.createdAt),
      "From shop": `${t.fromBranch.name} (${t.fromBranch.code})`,
      "To shop": `${t.toBranch.name} (${t.toBranch.code})`,
      Product: t.variant.product.name,
      "Product code": t.variant.product.code ?? "",
      Size: t.variant.size,
      Color: t.variant.color,
      SKU: t.variant.sku,
      Quantity: t.quantity,
      Note: t.note ?? "",
      "Transferred by":
        t.transferredBy?.name || t.transferredBy?.username || "",
    })),
  );
  sheetNames.push("Transfers");

  if (options.isAdmin) {
    const customerHeaders = ["Name", "Phone", "Email", "Created at"];
    addSheet(
      wb,
      "Customers",
      customerHeaders,
      customers.map((c) => ({
        Name: c.name,
        Phone: c.phone ?? "",
        Email: c.email ?? "",
        "Created at": formatExportDateTime(c.createdAt),
      })),
    );
    sheetNames.push("Customers");

    const rawHeaders = [
      "Name",
      "Code",
      "Category",
      "Unit",
      "Supplier",
      "Cost per unit (ETB)",
      "Quantity",
      "Reorder threshold",
      "Location",
      "Branch",
      "Active",
    ];
    addSheet(
      wb,
      "Raw materials",
      rawHeaders,
      rawMaterials.map((m) => ({
        Name: m.name,
        Code: m.code ?? "",
        Category: m.category?.name ?? "",
        Unit: m.unitOfMeasure,
        Supplier: m.supplier?.name ?? "",
        "Cost per unit (ETB)": moneyNumber(m.costPerUnit),
        Quantity: qtyNumber(m.quantity),
        "Reorder threshold": qtyNumber(m.reorderThreshold),
        Location: m.location ?? "",
        Branch: m.branch
          ? `${m.branch.name} (${m.branch.code})`
          : "",
        Active: yesNo(m.isActive),
      })),
    );
    sheetNames.push("Raw materials");
  }

  const buffer = writeWorkbookBuffer(wb);
  return {
    buffer,
    filename: exportFilename(),
    sheetNames,
  };
}
