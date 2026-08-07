import * as XLSX from "xlsx";

export type CellValue = string | number | boolean | null | undefined;

const MAX_COL_WIDTH = 42;
const MIN_COL_WIDTH = 8;

/** Ethiopia-local timestamps as ISO-like YYYY-MM-DD HH:mm:ss */
export function formatExportDateTime(date: Date): string {
  return date.toLocaleString("sv-SE", { timeZone: "Africa/Addis_Ababa" });
}

/** Ethiopia-local calendar date YYYY-MM-DD */
export function formatExportDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Africa/Addis_Ababa" });
}

/** Currency / decimal as finite number with 2 places (Excel number, not string). */
export function moneyNumber(value: { toString(): string } | number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function qtyNumber(value: { toString(): string } | number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return 0;
  return n;
}

export function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

/**
 * Build a worksheet from ordered headers + row objects.
 * Freezes the header row and sets reasonable column widths.
 */
export function sheetFromRows(
  headers: string[],
  rows: Array<Record<string, CellValue>>,
): XLSX.WorkSheet {
  const aoa: CellValue[][] = [
    headers,
    ...rows.map((row) => headers.map((h) => (row[h] ?? "") as CellValue)),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Community xlsx ignores most styles; bold is set when a style-aware write path is used.
  for (let c = 0; c < headers.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[ref];
    if (cell) {
      cell.s = {
        font: { bold: true },
        alignment: { vertical: "center", wrapText: true },
      };
    }
  }

  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };
  ws["!views"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2" }];

  const widths = headers.map((header, colIdx) => {
    let max = header.length;
    for (let r = 1; r < aoa.length; r++) {
      const v = aoa[r]![colIdx];
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = len;
    }
    return {
      wch: Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, max + 2)),
    };
  });
  ws["!cols"] = widths;

  return ws;
}

export function addSheet(
  workbook: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: Array<Record<string, CellValue>>,
) {
  const safeName = name.slice(0, 31);
  const ws = sheetFromRows(headers, rows);
  XLSX.utils.book_append_sheet(workbook, ws, safeName);
}

/** README-style sheet: column A questions/labels, column B values. */
export function addReadmeSheet(
  workbook: XLSX.WorkBook,
  lines: Array<[string, string]>,
) {
  const headers = ["Item", "Value"];
  const rows = lines.map(([item, value]) => ({
    Item: item,
    Value: value,
  }));
  addSheet(workbook, "README", headers, rows);
}

export function writeWorkbookBuffer(workbook: XLSX.WorkBook): Buffer {
  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  }) as Buffer;
}

export function createWorkbook(): XLSX.WorkBook {
  return XLSX.utils.book_new();
}

export function exportFilename(date = new Date()): string {
  const day = formatExportDate(date);
  return `esset-export-${day}.xlsx`;
}
