"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  setAssetTypeActive,
  setMaterialCategoryActive,
  setProductCategoryActive,
  updateAssetType,
  updateMaterialCategory,
  updateProductCategory,
} from "@/lib/actions/setup";

type Item = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export function EditableCategoryList({
  kind,
  items,
}: {
  kind: "material" | "product" | "asset";
  items: Item[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setActive =
    kind === "material"
      ? setMaterialCategoryActive
      : kind === "product"
        ? setProductCategoryActive
        : setAssetTypeActive;

  const update =
    kind === "material"
      ? updateMaterialCategory
      : kind === "product"
        ? updateProductCategory
        : updateAssetType;

  return (
    <ul className="space-y-2 border-t border-border pt-3 text-sm">
      {items.map((c) => (
        <li key={c.id} className="space-y-2">
          {editingId === c.id ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setPending(true);
                setError(null);
                const result = await update(c.id, {
                  name,
                  description: c.description,
                });
                setPending(false);
                if (!result.success) {
                  setError(result.error ?? "Failed");
                  return;
                }
                setEditingId(null);
                router.refresh();
              }}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 max-w-[180px]"
              />
              <Button type="submit" size="sm" disabled={pending}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
              {error && <span className="text-xs text-danger">{error}</span>}
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={!c.isActive ? "text-muted line-through" : ""}>
                {c.name}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(c.id);
                    setName(c.name);
                    setError(null);
                  }}
                >
                  Edit
                </Button>
                <ConfirmActionButton
                  label={c.isActive ? "Hide" : "Show"}
                  confirmMessage={
                    c.isActive
                      ? `Hide “${c.name}” from dropdowns?`
                      : `Show “${c.name}” again?`
                  }
                  action={() => setActive(c.id, !c.isActive)}
                  variant="secondary"
                />
              </div>
            </div>
          )}
        </li>
      ))}
      {items.length === 0 && (
        <li className="text-muted">None yet — add one above.</li>
      )}
    </ul>
  );
}
