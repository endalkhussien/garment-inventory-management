"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "U";
}

export function TopBarClient({
  notificationSlot,
  onOpenMobileNav,
}: {
  notificationSlot: ReactNode;
  onOpenMobileNav: () => void;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const isShop = user?.role?.name === "Shop";
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push("/products");
      return;
    }
    router.push(`/products?q=${encodeURIComponent(q)}`);
  }

  const branchLabel = user?.branch?.name ?? "HQ Warehouse";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Context switcher (Stitch HQ / Global) */}
        {!isShop ? (
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/central"
              className={cn(
                "pb-0.5 text-sm transition-colors",
                pathname.startsWith("/central") || pathname === "/"
                  ? "border-b-2 border-primary font-bold text-primary opacity-90"
                  : "text-muted hover:text-[var(--text-primary)]",
              )}
            >
              HQ Warehouse
            </Link>
            <Link
              href="/setup/shops"
              className={cn(
                "pb-0.5 text-sm transition-colors",
                pathname.startsWith("/setup/shops") ||
                  pathname.startsWith("/shops/")
                  ? "border-b-2 border-primary font-bold text-primary opacity-90"
                  : "text-muted hover:text-[var(--text-primary)]",
              )}
            >
              Global View
            </Link>
          </nav>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{branchLabel}</p>
            <p className="truncate text-xs text-muted">Shop overview</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <form
          onSubmit={onSearch}
          className="relative hidden sm:block"
          role="search"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKUs..."
            className="h-9 w-44 rounded-full border border-border bg-[var(--surface-container-low)] pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary md:w-64"
          />
        </form>

        <ThemeToggle />
        {notificationSlot}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-full px-1.5">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-[var(--primary-container)] text-xs font-bold text-white">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-medium leading-none">
                  {user?.name ?? "User"}
                </p>
                <p className="text-xs text-muted">{user?.role?.name ?? "Role"}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                <p className="text-xs font-normal text-muted">
                  {user?.username ? `@${user.username}` : user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">Account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
