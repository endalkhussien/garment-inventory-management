import { CsvDownloadButton } from "@/components/reports/csv-download-button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SalesReportPage() {
  const sales = await prisma.sale.findMany({
    include: {
      branch: true,
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows = sales.map((s) => ({
    receipt: s.receiptNumber,
    branch: s.branch.name,
    total: toNumber(s.total),
    return: s.isReturn ? "YES" : "NO",
    date: s.createdAt.toISOString(),
  }));

  const csv = [
    "Receipt,Branch,Total,Return,Date",
    ...rows.map(
      (r) => `${r.receipt},${r.branch},${r.total},${r.return},${r.date}`,
    ),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sales report</h1>
          <p className="text-sm text-muted">{rows.length} receipts</p>
        </div>
        <CsvDownloadButton filename="sales-report.csv" content={csv} />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Return</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.receipt} className="border-t border-border/60">
                <td className="px-3 py-2">{r.receipt}</td>
                <td className="px-3 py-2 text-muted">{r.branch}</td>
                <td className="px-3 py-2">{formatEtb(r.total)}</td>
                <td className="px-3 py-2 text-muted">{r.return}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
