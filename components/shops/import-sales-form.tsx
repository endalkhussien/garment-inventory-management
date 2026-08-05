"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { importExternalSales } from "@/lib/actions/import-sales";
import { PAYMENT_METHODS } from "@/lib/validations/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatEtb } from "@/lib/format";

type BranchOption = { id: string; name: string };

const formSchema = z.object({
  branchId: z.string().min(1),
  note: z.string().optional(),
  csvText: z.string().min(1, "Paste external POS sales data"),
});

type ParsedLine = {
  code: string;
  quantity: number;
  unitPrice?: number;
  soldAt?: string;
  externalReceipt?: string;
  paymentMethod?: (typeof PAYMENT_METHODS)[number];
};

function parsePayment(raw?: string): (typeof PAYMENT_METHODS)[number] | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (v === "MOBILE" || v === "MM" || v === "MOBILE_MONEY") return "MOBILE_MONEY";
  if (v === "BANK" || v === "BANK_TRANSFER" || v === "TRANSFER") return "BANK_TRANSFER";
  if (v === "CASH") return "CASH";
  return undefined;
}

/**
 * CSV columns (header optional):
 * code, quantity [, unit_price] [, date] [, receipt] [, payment]
 */
export function parseExternalSalesCsv(text: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("code") || lower.startsWith("sku") || lower.startsWith("product")) {
      continue;
    }
    const parts = line.split(/[,\t;]/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const code = parts[0]!;
    const quantity = Number(parts[1]);
    if (!code || !Number.isFinite(quantity) || quantity <= 0) continue;

    const unitPrice =
      parts[2] && parts[2] !== "" ? Number(parts[2]) : undefined;
    const soldAt = parts[3] && parts[3] !== "" ? parts[3] : undefined;
    const externalReceipt =
      parts[4] && parts[4] !== "" ? parts[4] : undefined;
    const paymentMethod = parsePayment(parts[5]);

    lines.push({
      code,
      quantity: Math.floor(quantity),
      unitPrice:
        unitPrice != null && Number.isFinite(unitPrice) && unitPrice >= 0
          ? unitPrice
          : undefined,
      soldAt,
      externalReceipt,
      paymentMethod,
    });
  }
  return lines;
}

export function ImportSalesForm({
  branches,
  lockedBranchId,
  defaultBranchId,
}: {
  branches: BranchOption[];
  lockedBranchId?: string | null;
  defaultBranchId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: lockedBranchId ?? defaultBranchId ?? branches[0]?.id ?? "",
      note: "",
      csvText:
        "code,quantity,unit_price,date,receipt,payment\nMCS-001,2,1500,2026-08-01,POS-1001,CASH\n",
    },
  });

  const [fileName, setFileName] = useState<string | null>(null);
  const csvText = watch("csvText") ?? "";

  const preview = useMemo(
    () => parseExternalSalesCsv(csvText),
    [csvText],
  );

  async function onFileChange(file: File | null) {
    setError(null);
    setOk(null);
    setFileName(null);
    if (!file) return;
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".csv") || name.endsWith(".txt")) {
        const text = await file.text();
        setValue("csvText", text);
        setFileName(file.name);
        return;
      }
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        setValue("csvText", csv);
        setFileName(file.name);
        return;
      }
      setError("Use .csv, .xlsx, or .xls");
    } catch {
      setError("Could not read file.");
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setOk(null);
    const lines = parseExternalSalesCsv(values.csvText);
    if (lines.length === 0) {
      setError(
        "No valid lines. Use: code,quantity[,unit_price][,date][,receipt][,payment]",
      );
      return;
    }

    const result = await importExternalSales({
      branchId: values.branchId,
      note: values.note || (fileName ? `Bulk sales ${fileName}` : "External POS import"),
      lines: lines.map((l) => ({
        code: l.code,
        quantity: l.quantity,
        unitPrice: l.unitPrice ?? null,
        soldAt: l.soldAt ?? null,
        externalReceipt: l.externalReceipt ?? null,
        paymentMethod: l.paymentMethod ?? "CASH",
      })),
    });

    if (!result.success) {
      setError(result.error ?? "Import failed.");
      return;
    }

    const skip =
      result.skipped && result.skipped.length > 0
        ? ` Skipped: ${result.skipped.slice(0, 6).join(", ")}.`
        : "";
    setOk(
      `Imported ${result.imported} sale line(s)${
        result.totalRevenue != null
          ? ` · ${formatEtb(result.totalRevenue)}`
          : ""
      }. Stock deducted.${skip}`,
    );
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!lockedBranchId && (
        <div className="space-y-2">
          <Label>Shop</Label>
          <Select {...register("branchId")}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Upload CSV or Excel</Label>
        <Input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          onChange={(e) => {
            void onFileChange(e.target.files?.[0] ?? null);
          }}
        />
        {fileName && (
          <p className="text-xs text-success">Loaded: {fileName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Or paste CSV</Label>
        <p className="text-xs text-muted">
          Columns:{" "}
          <code className="text-secondary">
            code, quantity [, unit_price] [, date] [, receipt] [, payment]
          </code>
        </p>
        <Textarea
          rows={8}
          className="font-mono text-xs"
          {...register("csvText")}
        />
      </div>

      <div className="space-y-2">
        <Label>Batch note (optional)</Label>
        <Input {...register("note")} placeholder="Daily POS export" />
      </div>

      {preview.length > 0 && (
        <p className="text-xs text-muted">
          Parsed {preview.length} sale line(s) ready to import.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {ok && <p className="text-sm text-success">{ok}</p>}

      <Button type="submit" disabled={isSubmitting || branches.length === 0}>
        {isSubmitting ? "Importing..." : "Import bulk sales"}
      </Button>
    </form>
  );
}
