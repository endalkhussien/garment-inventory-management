/**
 * Parse stock restock / sales CSV-style lines: code, quantity [, ...]
 */
export function parseCodeQuantityText(
  text: string,
): Array<{ code: string; quantity: number }> {
  const lines: Array<{ code: string; quantity: number }> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (
      lower.startsWith("code") ||
      lower.startsWith("sku") ||
      lower.startsWith("product")
    ) {
      continue;
    }
    const parts = line.split(/[,\t;]/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const code = parts[0]!;
    const quantity = Number(parts[1]);
    if (!code || !Number.isFinite(quantity) || quantity <= 0) continue;
    lines.push({ code, quantity: Math.floor(quantity) });
  }
  return lines;
}

/**
 * First sheet: use header row if present, else column A=code B=qty.
 */
export async function parseCodeQuantitySpreadsheet(
  data: ArrayBuffer,
): Promise<Array<{ code: string; quantity: number }>> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as Array<Array<string | number>>;

  if (rows.length === 0) return [];

  const first = rows[0]!.map((c) => String(c).trim().toLowerCase());
  const hasHeader =
    first.some((h) => h === "code" || h === "sku" || h === "product") ||
    first.some((h) => h.includes("qty") || h === "quantity");

  let codeIdx = 0;
  let qtyIdx = 1;
  let start = 0;

  if (hasHeader) {
    // Prefer explicit sku (template uses SKU in `code` for size/color accuracy).
    const skuOnly = first.findIndex((h) => h === "sku");
    const c = first.findIndex(
      (h) =>
        h === "code" ||
        h === "sku" ||
        h === "product" ||
        (h.includes("code") && !h.includes("product_code") && h !== "product_code"),
    );
    const q = first.findIndex(
      (h) => h === "quantity" || h === "qty" || h.includes("qty"),
    );
    if (skuOnly >= 0) codeIdx = skuOnly;
    else if (c >= 0) codeIdx = c;
    if (q >= 0) qtyIdx = q;
    start = 1;
  }

  const lines: Array<{ code: string; quantity: number }> = [];
  for (let i = start; i < rows.length; i++) {
    const row = rows[i]!;
    const code = String(row[codeIdx] ?? "").trim();
    const quantity = Number(row[qtyIdx]);
    if (!code || !Number.isFinite(quantity) || quantity <= 0) continue;
    lines.push({ code, quantity: Math.floor(quantity) });
  }
  return lines;
}

export function isSpreadsheetFile(name: string) {
  const n = name.toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv");
}
