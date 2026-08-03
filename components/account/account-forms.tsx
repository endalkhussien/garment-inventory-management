"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { changeMyPassword, updateMyProfile } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  name,
  username,
}: {
  name: string;
  username: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setOk(null);
        const fd = new FormData(e.currentTarget);
        const result = await updateMyProfile({
          name: String(fd.get("name") ?? ""),
          username: String(fd.get("username") ?? ""),
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        setOk("Saved. Sign out and back in if username does not update in the menu.");
        router.refresh();
      }}
    >
      <div className="space-y-1">
        <Label>Display name</Label>
        <Input name="name" required defaultValue={name} />
      </div>
      <div className="space-y-1">
        <Label>Username</Label>
        <Input name="username" required defaultValue={username} />
        <p className="text-xs text-muted">Used to sign in.</p>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
        {ok && <p className="text-sm text-success">{ok}</p>}
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid max-w-md gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setOk(null);
        const fd = new FormData(e.currentTarget);
        const result = await changeMyPassword({
          currentPassword: String(fd.get("currentPassword") ?? ""),
          newPassword: String(fd.get("newPassword") ?? ""),
          confirmPassword: String(fd.get("confirmPassword") ?? ""),
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        setOk("Password updated.");
        (e.target as HTMLFormElement).reset();
      }}
    >
      <div className="space-y-1">
        <Label>Current password</Label>
        <Input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1">
        <Label>New password</Label>
        <Input
          name="newPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1">
        <Label>Confirm new password</Label>
        <Input
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating..." : "Change password"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
        {ok && <p className="text-sm text-success">{ok}</p>}
      </div>
    </form>
  );
}
