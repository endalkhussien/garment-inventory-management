"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createShopStockOrder } from "@/lib/actions/shop-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type WarehouseItem = {
  variantId: string;
  label: string;
  available: number;
  sellingPrice: number;
};

export function ShopOrderForm({
  warehouses,
  defaultWarehouseId,
  catalog: initialCatalog,
  catalogByWarehouse,
}: {
  warehouses: { id: string; name: string }[];
  defaultWarehouseId?: string;
  catalog: WarehouseItem[];
  catalogByWarehouse?: Record<string, WarehouseItem[]>;
}) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(
    defaultWarehouseId ?? warehouses[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const catalog =
    catalogByWarehouse?.[warehouseId] ?? initialCatalog ?? [];

  const [lines, setLines] = useState<
    { variantId: string; quantityRequested: number }[]
  >([{ variantId: "", quantityRequested: 1 }]);

  // Keep first line product valid when warehouse/catalog changes
  const catalogKey = catalog.map((c) => c.variantId).join(",");
  useEffect(() => {
    if (catalog.length === 0) return;
    setLines((prev) =>
      prev.map((l) =>
        catalog.some((c) => c.variantId === l.variantId)
          ? l
          : { ...l, variantId: catalog[0].variantId },
      ),
    );
  }, [catalogKey, catalog]);

  const byId = useMemo(() => {
    const map = new Map(catalog.map((c) => [c.variantId, c]));
    return map;
  }, [catalog]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const result = await createShopStockOrder({
          warehouseBranchId: warehouseId,
          note: String(fd.get("note") ?? ""),
          lines: lines.filter((l) => l.variantId && l.quantityRequested > 0),
        });
        setPending(false);
        if (!result.success || !result.id) {
          setError(result.error ?? "Failed");
          return;
        }
        router.push(`/shops/orders/${result.id}`);
        router.refresh();
      }}
    >
      <div className="space-y-1">
        <Label>Warehouse (source)</Label>
        <Select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted">
          Quantities below show live warehouse availability.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Products to order</Label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  variantId: catalog[0]?.variantId ?? "",
                  quantityRequested: 1,
                },
              ])
            }
          >
            Add line
          </Button>
        </div>

        {catalog.length === 0 ? (
          <p className="text-sm text-warning">
            Warehouse has no finished goods yet. Ask Admin to produce and stock
            HQ first.
          </p>
        ) : (
          lines.map((line, index) => {
            const item = byId.get(line.variantId);
            return (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-12"
              >
                <div className="md:col-span-7 space-y-1">
                  <Label>Product</Label>
                  <Select
                    value={line.variantId}
                    onChange={(e) => {
                      const variantId = e.target.value;
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, variantId } : l,
                        ),
                      );
                    }}
                  >
                    {catalog.map((c) => (
                      <option key={c.variantId} value={c.variantId}>
                        {c.label} — avail {c.available}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    max={item?.available ?? undefined}
                    value={line.quantityRequested}
                    onChange={(e) => {
                      const quantityRequested = Number(e.target.value);
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, quantityRequested } : l,
                        ),
                      );
                    }}
                  />
                  <p className="text-xs text-muted">
                    Available now: {item?.available ?? 0}
                  </p>
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-1">
        <Label>Note</Label>
        <Textarea name="note" rows={2} placeholder="Urgent restock for weekend" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={pending || catalog.length === 0}>
        {pending ? "Submitting..." : "Submit order to warehouse"}
      </Button>
    </form>
  );
}
