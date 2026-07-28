"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type OrderRow = {
  id: string;
  orderNumber: string;
  name: string;
  variant: string;
  good: number;
  target: number;
  status: string;
};

type InventoryRow = {
  id: string;
  name: string;
  category: string;
  stock: number;
  status: "In stock" | "Low stock" | "Out of stock";
};

function orderStatusVariant(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "secondary" as const;
}

function stockStatusVariant(status: InventoryRow["status"]) {
  if (status === "In stock") return "success" as const;
  if (status === "Low stock") return "warning" as const;
  return "danger" as const;
}

export function CurrentOrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Current production orders</h2>
      </div>
      {orders.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No production orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <Link
                      href={`/production/orders/${o.id}`}
                      className="text-secondary hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {o.name}
                    <span className="ml-1 text-muted">({o.variant})</span>
                  </td>
                  <td className="px-3 py-2">
                    {o.good}/{o.target}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={orderStatusVariant(o.status)}>
                      {o.status.replace("_", " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function InventoryStatusTable({ rows }: { rows: InventoryRow[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Inventory status</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No materials tracked yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <Link
                      href="/inventory/raw-materials"
                      className="text-secondary hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">{r.category}</td>
                  <td className="px-3 py-2">{r.stock}</td>
                  <td className="px-3 py-2">
                    <Badge variant={stockStatusVariant(r.status)}>
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
