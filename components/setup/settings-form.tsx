"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateAppSettings } from "@/lib/actions/settings";
import type { AppSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setSaved(false);
        const fd = new FormData(e.currentTarget);

        const result = await updateAppSettings({
          companyName: String(fd.get("companyName") ?? ""),
          companyTagline: String(fd.get("companyTagline") ?? ""),
          currencyCode: String(fd.get("currencyCode") ?? ""),
          locale: String(fd.get("locale") ?? ""),
          largeStockOutThreshold: Number(fd.get("largeStockOutThreshold")),
          requirePriceOverrideApproval:
            fd.get("requirePriceOverrideApproval") === "on",
          defaultOverheadPercent: Number(fd.get("defaultOverheadPercent")),
          defaultMarginPercent: Number(fd.get("defaultMarginPercent")),
          defaultFinishedGoodsReorderAt: Number(
            fd.get("defaultFinishedGoodsReorderAt"),
          ),
          payrollDaysPerMonth: Number(fd.get("payrollDaysPerMonth")),
        });

        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Could not save");
          return;
        }
        setSaved(true);
        router.refresh();
      }}
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Branding
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="companyName">Product / company name</Label>
            <Input
              id="companyName"
              name="companyName"
              required
              defaultValue={settings.companyName}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="companyTagline">Tagline</Label>
            <Input
              id="companyTagline"
              name="companyTagline"
              defaultValue={settings.companyTagline}
              placeholder="Ethiopia"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Money & locale
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="currencyCode">Currency code</Label>
            <Input
              id="currencyCode"
              name="currencyCode"
              required
              defaultValue={settings.currencyCode}
              placeholder="ETB"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="locale">Locale</Label>
            <Input
              id="locale"
              name="locale"
              required
              defaultValue={settings.locale}
              placeholder="en-ET"
            />
            <p className="text-xs text-muted">
              Controls thousand separators (e.g. en-ET → ETB 24,028.85)
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Approvals & stock
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="largeStockOutThreshold">
              Large stock-out threshold
            </Label>
            <Input
              id="largeStockOutThreshold"
              name="largeStockOutThreshold"
              type="number"
              min={0}
              step="0.001"
              required
              defaultValue={settings.largeStockOutThreshold}
            />
            <p className="text-xs text-muted">
              OUT movements at or above this qty need approval
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="defaultFinishedGoodsReorderAt">
              Default FG reorder level
            </Label>
            <Input
              id="defaultFinishedGoodsReorderAt"
              name="defaultFinishedGoodsReorderAt"
              type="number"
              min={1}
              required
              defaultValue={settings.defaultFinishedGoodsReorderAt}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requirePriceOverrideApproval"
            defaultChecked={settings.requirePriceOverrideApproval}
            className="h-4 w-4 rounded border-border"
          />
          Require approval when selling price is set below cost
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Pricing & payroll defaults
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="defaultOverheadPercent">Default overhead %</Label>
            <Input
              id="defaultOverheadPercent"
              name="defaultOverheadPercent"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={settings.defaultOverheadPercent}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="defaultMarginPercent">Default margin %</Label>
            <Input
              id="defaultMarginPercent"
              name="defaultMarginPercent"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={settings.defaultMarginPercent}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payrollDaysPerMonth">Payroll days / month</Label>
            <Input
              id="payrollDaysPerMonth"
              name="payrollDaysPerMonth"
              type="number"
              min={1}
              max={31}
              required
              defaultValue={settings.payrollDaysPerMonth}
            />
            <p className="text-xs text-muted">
              Used to prorate monthly base salary
            </p>
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && (
        <p className="text-sm text-success">Settings saved. Refresh to see branding everywhere.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
