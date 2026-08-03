"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitStocktakeCounts } from "@/lib/actions/stocktake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Line = {
  id: string;
  materialName: string;
  unit: string;
  systemQty: number;
  countedQty: number | null;
  note: string | null;
};

export function StocktakeCountForm({
  sessionId,
  lines,
  readOnly,
}: {
  sessionId: string;
  lines: Line[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (readOnly) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">System</th>
              <th className="px-3 py-2">Counted</th>
              <th className="px-3 py-2">Variance</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const counted = l.countedQty ?? l.systemQty;
              const variance = counted - l.systemQty;
              return (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2">{l.materialName}</td>
                  <td className="px-3 py-2">
                    {l.systemQty} {l.unit}
                  </td>
                  <td className="px-3 py-2">
                    {counted} {l.unit}
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      Math.abs(variance) > 0.0001
                        ? "text-warning"
                        : "text-muted"
                    }`}
                  >
                    {variance > 0 ? "+" : ""}
                    {variance.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setMessage(null);
        const fd = new FormData(e.currentTarget);
        const payload = lines.map((l) => ({
          lineId: l.id,
          countedQty: Number(fd.get(`counted-${l.id}`)),
          note: String(fd.get(`note-${l.id}`) ?? ""),
        }));
        const result = await submitStocktakeCounts({
          sessionId,
          lines: payload,
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        setMessage(
          result.pendingApproval
            ? "Submitted for approval — variances need admin review."
            : "No variances. Stocktake completed.",
        );
        router.refresh();
      }}
    >
      <div className="space-y-4">
        {lines.map((l) => (
          <div
            key={l.id}
            className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-4"
          >
            <div className="md:col-span-2">
              <p className="font-medium">{l.materialName}</p>
              <p className="text-xs text-muted">
                System: {l.systemQty} {l.unit}
              </p>
            </div>
            <div className="space-y-1">
              <Label>Counted qty</Label>
              <Input
                name={`counted-${l.id}`}
                type="number"
                min={0}
                step="0.001"
                required
                defaultValue={l.countedQty ?? l.systemQty}
              />
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input name={`note-${l.id}`} defaultValue={l.note ?? ""} />
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit counts"}
      </Button>
    </form>
  );
}
