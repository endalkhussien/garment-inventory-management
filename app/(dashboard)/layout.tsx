import { getServerSession } from "next-auth";

import { AppShell } from "@/components/layout/app-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const settings = await getAppSettings();

  const notifications = userId
    ? await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  return (
    <AppShell
      userId={userId}
      companyName={settings.companyName}
      companyTagline={settings.companyTagline}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
    >
      {children}
    </AppShell>
  );
}
