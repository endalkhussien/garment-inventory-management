"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deactivateEmployee } from "@/lib/actions/production";
import { Button } from "@/components/ui/button";

export function DeactivateEmployeeButton({
  employeeId,
  name,
}: {
  employeeId: string;
  name: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Deactivate ${name}? They will leave active lists.`)) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deactivateEmployee(employeeId);
            if (!result.success) {
              setError(result.error ?? "Failed");
              return;
            }
            router.push("/production/employees");
            router.refresh();
          });
        }}
      >
        Deactivate
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
