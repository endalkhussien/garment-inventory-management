"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download } from "lucide-react";
import { z } from "zod";

import { restockImport, restockManually } from "@/lib/actions/restock";
import {
  isSpreadsheetFile,
  parseCodeQuantitySpreadsheet,
  parseCodeQuantityText,
} from "@/lib/parse-import-file";
import { manualRestockSchema } from "@/lib/validations/restock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type VariantOption = {
  id: string;
  label: string;
  code: string;
};

type BranchOption = { id: string; name: string };

type Props = {
  branches: BranchOption[];
  variants: VariantOption[];
  lockedBranchId?: string | null;
  defaultBranchId?: string;
  /** Shop-facing labels emphasize adding own stock */
  shopMode?: boolean;
};

const importFormSchema = z.object({
  branchId: z.string().min(1),
  note: z.string().optional(),
});

export function RestockForms({
  branches,
  variants,
  lockedBranchId,
  defaultBranchId,
  shopMode = false,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [manualError, setManualError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
  const [fileLines, setFileLines] = useState<
    Array<{ code: string; quantity: number }>
  >([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const branchDefault =
    lockedBranchId ?? defaultBranchId ?? branches[0]?.id ?? "";

  const manualForm = useForm({
    resolver: zodResolver(manualRestockSchema),
    defaultValues: {
      branchId: branchDefault,
      variantId: variants[0]?.id ?? "",
      quantity: 1,
      note: "",
    },
  });

  const importForm = useForm({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      branchId: branchDefault,
      note: "",
    },
  });

  const shopLocked = Boolean(lockedBranchId);

  const onManual = manualForm.handleSubmit(async (values) => {
    setManualError(null);
    const result = await restockManually(values);
    if (!result.success) {
      setManualError(result.error ?? "Could not add stock.");
      return;
    }
    router.refresh();
    manualForm.setValue("quantity", 1);
    manualForm.setValue("note", "");
  });

  async function onFileChange(file: File | null) {
    setImportError(null);
    setImportOk(null);
    setFileLines([]);
    setFileName(null);
    if (!file) return;

    if (!isSpreadsheetFile(file.name)) {
      setImportError("Use a .csv, .xlsx, or .xls file from the restock template.");
      return;
    }

    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const lines = parseCodeQuantityText(text);
        if (lines.length === 0) {
          setImportError(
            "No valid rows. Fill the quantity column on the template (code + quantity).",
          );
          return;
        }
        setFileLines(lines);
        setFileName(file.name);
        return;
      }

      const buffer = await file.arrayBuffer();
      const lines = await parseCodeQuantitySpreadsheet(buffer);
      if (lines.length === 0) {
        setImportError(
          "No valid rows. Download the template, fill quantity, then upload again.",
        );
        return;
      }
      setFileLines(lines);
      setFileName(file.name);
    } catch {
      setImportError("Could not read that file. Use the Excel template (.xlsx).");
    }
  }

  const onImport = importForm.handleSubmit(async (values) => {
    setImportError(null);
    setImportOk(null);
    if (fileLines.length === 0) {
      setImportError(
        "Upload the filled restock template (.xlsx or .csv) first.",
      );
      return;
    }
    const result = await restockImport({
      branchId: values.branchId,
      note: values.note || (fileName ? `Import ${fileName}` : "Stock import"),
      lines: fileLines,
    });
    if (!result.success) {
      setImportError(result.error ?? "Import failed.");
      return;
    }
    const skipMsg =
      result.skipped && result.skipped.length > 0
        ? ` Skipped unknown codes: ${result.skipped.join(", ")}.`
        : "";
    setImportOk(`Added stock for ${result.imported} product line(s).${skipMsg}`);
    setFileLines([]);
    setFileName(null);
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "manual" ? "default" : "secondary"}
          onClick={() => setTab("manual")}
        >
          {shopMode ? "Add stock manually" : "Manual restock"}
        </Button>
        <Button
          type="button"
          variant={tab === "import" ? "default" : "secondary"}
          onClick={() => setTab("import")}
        >
          Import from template
        </Button>
      </div>

      {tab === "manual" && (
        <form onSubmit={onManual} className="space-y-4">
          {!shopLocked && (
            <div className="space-y-2">
              <Label>Shop</Label>
              <Select {...manualForm.register("branchId")}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Product</Label>
            <Select {...manualForm.register("variantId")}>
              {variants.length === 0 ? (
                <option value="">No products registered by HQ yet</option>
              ) : (
                variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))
              )}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity to add</Label>
            <Input
              type="number"
              min={1}
              step={1}
              {...manualForm.register("quantity", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea rows={2} {...manualForm.register("note")} />
          </div>
          {manualError && (
            <p className="text-sm text-danger">{manualError}</p>
          )}
          <Button
            type="submit"
            disabled={
              manualForm.formState.isSubmitting || variants.length === 0
            }
          >
            {manualForm.formState.isSubmitting ? "Saving..." : "Add to my stock"}
          </Button>
        </form>
      )}

      {tab === "import" && (
        <form onSubmit={onImport} className="space-y-4">
          {!shopLocked && (
            <div className="space-y-2">
              <Label>Shop</Label>
              <Select {...importForm.register("branchId")}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="rounded-xl border border-border bg-page/60 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">1. Download product template</p>
              <p className="mt-1 text-xs text-muted">
                Excel lists every product the same way they are created in the
                catalog (code, name, size, color). Fill only the{" "}
                <code className="text-secondary">quantity</code> column for
                items you received.
              </p>
            </div>
            <Button type="button" variant="secondary" asChild>
              <a href="/api/export/restock-template" download>
                <Download className="mr-2 h-4 w-4" />
                Download restock template
              </a>
            </Button>
          </div>

          <div className="space-y-2">
            <Label>2. Upload filled file</Label>
            <p className="text-xs text-muted">
              Accepts the template as .xlsx, .xls, or .csv. Rows with blank or
              zero quantity are skipped.
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => {
                void onFileChange(e.target.files?.[0] ?? null);
              }}
            />
            {fileName && (
              <p className="text-xs text-success">
                Loaded: {fileName} · {fileLines.length} line(s) with quantity
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              {...importForm.register("note")}
              placeholder="e.g. Weekly warehouse delivery"
            />
          </div>

          {importError && (
            <p className="text-sm text-danger">{importError}</p>
          )}
          {importOk && (
            <p className="text-sm text-success">{importOk}</p>
          )}
          <Button
            type="submit"
            disabled={
              importForm.formState.isSubmitting || fileLines.length === 0
            }
          >
            {importForm.formState.isSubmitting
              ? "Importing..."
              : "Import into stock"}
          </Button>
        </form>
      )}
    </div>
  );
}
