"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validations/auth";

export function LoginForm({
  companyName = "Esset Inventory",
  companyTagline = "Garment Management",
}: {
  companyName?: string;
  companyTagline?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ login, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials");
      return;
    }

    setIsSubmitting(true);

    try {
      const health = await fetch("/api/health", { cache: "no-store" });
      if (!health.ok) {
        setIsSubmitting(false);
        setError(
          "Database is offline. Start Docker Desktop, then run: docker compose up -d",
        );
        return;
      }
    } catch {
      setIsSubmitting(false);
      setError("Cannot reach the app API. Is the server running?");
      return;
    }

    const result = await signIn("credentials", {
      login: parsed.data.login,
      password: parsed.data.password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid username or password");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-elevated">
      <div className="bg-[var(--primary-container)] px-6 py-8 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-fixed)] text-[var(--on-primary-fixed)]">
            <Package2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{companyName}</h1>
            <p className="text-sm text-[var(--on-primary-container)]">
              {companyTagline || "Garment Management"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <p className="label-caps mb-4">Sign in</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Username or email</Label>
            <Input
              id="login"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[var(--error-container)]/40 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
