import Link from "next/link";

import { ExportDataCard } from "@/components/setup/export-data-card";
import { SettingsForm } from "@/components/setup/settings-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, shops] = await Promise.all([
    getAppSettings(),
    prisma.branch.findMany({
      where: { isShop: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">System settings</h1>
          <p className="mt-1 text-sm text-muted">
            Branding, currency, approvals, and business defaults — no code
            changes needed.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/setup">Setup guide</Link>
        </Button>
      </div>

      <Card>
        <SettingsForm settings={settings} />
      </Card>

      <Card>
        <ExportDataCard mode="admin" shops={shops} />
      </Card>
    </div>
  );
}
