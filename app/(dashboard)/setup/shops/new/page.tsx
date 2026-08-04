import Link from "next/link";

import { InitiateShopForm } from "@/components/shops/initiate-shop-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { suggestNextShopCode } from "@/lib/shops";

export default async function NewShopPage() {
  await requireAdmin();
  const suggestedCode = await suggestNextShopCode();

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">New shop</h1>
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
