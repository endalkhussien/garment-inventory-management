"use client";

import { useState } from "react";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { BranchForm } from "@/components/setup/branch-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setBranchActive } from "@/lib/actions/setup";

type BranchRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isWarehouse: boolean;
  isShop: boolean;
  isActive: boolean;
};

export function BranchesAdminTable({ branches }: { branches: BranchRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead className="bg-page text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Code</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id} className="border-t border-border/60 align-top">
              <td className="px-3 py-2" colSpan={editingId === b.id ? 5 : 1}>
                {editingId === b.id ? (
                  <div className="space-y-3 py-2">
                    <BranchForm
                      branch={b}
                      onDone={() => setEditingId(null)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel edit
                    </Button>
                  </div>
                ) : (
                  b.name
                )}
              </td>
              {editingId !== b.id && (
                <>
                  <td className="px-3 py-2 text-muted">{b.code}</td>
                  <td className="px-3 py-2 space-x-1">
                    {b.isWarehouse && <Badge>Warehouse</Badge>}
                    {b.isShop && <Badge variant="secondary">Shop</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={b.isActive ? "success" : "danger"}>
                      {b.isActive ? "Active" : "Off"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingId(b.id)}
                      >
                        Edit
                      </Button>
                      <ConfirmActionButton
                        label={b.isActive ? "Deactivate" : "Reactivate"}
                        confirmMessage={
                          b.isActive
                            ? `Deactivate ${b.name}? It will hide from new picks.`
                            : `Reactivate ${b.name}?`
                        }
                        action={() => setBranchActive(b.id, !b.isActive)}
                        variant={b.isActive ? "danger" : "default"}
                      />
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
