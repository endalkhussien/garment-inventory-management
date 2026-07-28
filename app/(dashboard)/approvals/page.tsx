import { getServerSession } from "next-auth";

import { ApprovalActions } from "@/components/approvals/approval-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const [pending, mine] = await Promise.all([
    prisma.approval.findMany({
      where: { status: "PENDING" },
      include: { requestedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    userId
      ? prisma.approval.findMany({
          where: { requestedById: userId },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="mt-1 text-sm text-muted">
          Only unusual actions wait here (large stock-outs, optional price
          overrides). Everyday work stays immediate.
        </p>
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Queue for approvers</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Nothing waiting.</p>
        ) : (
          pending.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 border-t border-border/60 pt-3"
            >
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-muted">{a.summary}</p>
                <p className="text-xs text-muted">
                  By {a.requestedBy?.name ?? a.requestedBy?.email ?? "—"} ·{" "}
                  {a.createdAt.toLocaleString("en-ET")}
                </p>
              </div>
              <ApprovalActions approvalId={a.id} />
            </div>
          ))
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">My submissions</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">You have not submitted any requests.</p>
        ) : (
          mine.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border-t border-border/60 pt-3 text-sm"
            >
              <div>
                <p>{a.title}</p>
                <p className="text-xs text-muted">{a.summary}</p>
              </div>
              <Badge
                variant={
                  a.status === "APPROVED"
                    ? "success"
                    : a.status === "REJECTED"
                      ? "danger"
                      : "warning"
                }
              >
                {a.status}
              </Badge>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
