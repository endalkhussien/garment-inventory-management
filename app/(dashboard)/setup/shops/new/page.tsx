import Link from "next/link";

import { InitiateShopForm } from "@/components/shops/initiate-shop-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { suggestNextShopCode } from "@/lib/actions/shops";
import { requireAdmin } from "@/lib/rbac";

export default async function NewShopPage() {
  await requireAdmin();
  const suggestedCode = await suggestNextShopCode();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Initiate new shop</h1>
          <p className="mt-1 text-sm text-muted">
            Creates the location and optionally the first Shop login in one step.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/setup/shops">Back</Link>
        </Button>
      </div>

      <Card>
        <InitiateShopForm suggestedCode={suggestedCode} />
      </Card>
    </div>
  );
}
