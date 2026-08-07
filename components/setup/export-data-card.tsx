"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type ExportShopOption = {
  id: string;
  name: string;
  code: string;
};

type ExportDataCardProps = {
  mode: "admin" | "shop";
  shops?: ExportShopOption[];
  /** Fixed branch label for shop mode */
  shopLabel?: string;
};

export function ExportDataCard({
  mode,
  shops = [],
  shopLabel,
}: ExportDataCardProps) {
  const [branchId, setBranchId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const description = useMemo(() => {
    if (mode === "shop") {
      return shopLabel
        ? `Download a formatted Excel backup for ${shopLabel}: stock, sales, staff, and more.`
        : "Download a formatted Excel backup of your shop data.";
    }
    return "Download a professional multi-sheet Excel workbook for recovery and offline review. Admin can export all shops or one shop; optionally limit sales and expenses by date.";
  }, [mode, shopLabel]);

  async function handleDownload() {
    setPending(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (mode === "admin" && branchId && branchId !== "all") {
        params.set("branchId", branchId);
      }
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const qs = params.toString();
      const url = qs ? `/api/export/data?${qs}` : "/api/export/data";
      const res = await fetch(url);

      if (!res.ok) {
        let message = "Export failed";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* ignore */
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "esset-export.xlsx";

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Could not download export. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Export / backup data
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mode === "admin" ? (
          <div className="space-y-1.5">
            <Label htmlFor="export-shop">Shop</Label>
            <Select
              id="export-shop"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={pending}
            >
              <option value="all">All shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="export-from">Sales from (optional)</Label>
          <Input
            id="export-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="export-to">Sales to (optional)</Label>
          <Input
            id="export-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      <p className="text-xs text-muted">
        Workbook includes Products, Shop stock, Sales, Sale items, Payments,
        Staff, Expenses, and Transfers
        {mode === "admin"
          ? "; plus Branches, Customers, and Raw materials for full HQ backup."
          : " for your shop. Passwords are never exported."}
      </p>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={handleDownload}
        disabled={pending}
        className="gap-2"
      >
        <Download className="h-4 w-4" aria-hidden />
        {pending ? "Preparing Excel…" : "Download Excel backup"}
      </Button>
    </div>
  );
}
