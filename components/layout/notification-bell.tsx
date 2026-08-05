"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useTransition } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell({
  userId,
  items,
}: {
  userId?: string;
  items: NotificationItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {userId && unread > 0 && (
            <button
              type="button"
              className="text-xs text-secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsRead(userId);
                  router.refresh();
                })
              }
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted">You&apos;re all caught up.</div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex cursor-pointer flex-col items-start gap-1"
              onClick={() =>
                startTransition(async () => {
                  if (!n.isRead) await markNotificationRead(n.id);
                  if (n.href) router.push(n.href);
                  else router.refresh();
                })
              }
            >
              <span className={`text-sm ${n.isRead ? "text-muted" : "font-medium"}`}>
                {n.title}
              </span>
              <span className="text-xs text-muted">{n.body}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/approvals">Open approvals</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
