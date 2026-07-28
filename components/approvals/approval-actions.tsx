"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { reviewApproval } from "@/lib/actions/approvals";
import { Button } from "@/components/ui/button";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (decision: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      await reviewApproval(approvalId, decision);
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => act("APPROVED")}>
        Approve
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => act("REJECTED")}
      >
        Reject
      </Button>
    </div>
  );
}
