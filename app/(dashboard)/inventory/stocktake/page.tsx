import Link from "next/link";

import { CreateStocktakeForm } from "@/components/inventory/create-stocktake-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function StocktakeListPage() {
  await requireAdmin();

  const [sessions, materials] = await Promise.all([
    prisma.stocktakeSession.findMany({
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.rawMaterial.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Stocktake / cycle count</h1>
        <p className="mt-1 text-sm text-muted">
          Compare physical qty to system. Variances need approval before books
          change — find process issues, not only fix numbers.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">New stocktake</h2>
        <CreateStocktakeForm materials={materials} />
      </Card>

      <Card className="overflow-x-auto p-0">
        {sessions.length === 0 ? (
          <p className="p-6 text-sm text-muted">No stocktakes yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Lines</th>
                <th className="px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/inventory/stocktake/${s.id}`}
                      className="font-medium text-secondary hover:underline"
                    >
                      {s.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {s.createdBy?.name ?? s.createdBy?.email ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3">{s.status}</td>
                  <td className="px-3 py-3">{s._count.lines}</td>
                  <td className="px-3 py-3 text-muted">
                    {s.createdAt.toLocaleString("en-ET")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Button asChild variant="secondary">
        <Link href="/inventory/lots">Material lots</Link>
      </Button>
    </div>
  );
}
