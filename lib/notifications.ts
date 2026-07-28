"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function createNotificationForAdmins(input: {
  title: string;
  body: string;
  href?: string;
}) {
  const admins = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: ["Admin", "Manager"] } },
    },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((user) => ({
      userId: user.id,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });

  revalidatePath("/");
}

export async function createNotificationForUser(input: {
  userId: string;
  title: string;
  body: string;
  href?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
  revalidatePath("/");
}

export async function markNotificationRead(id: string) {
  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  revalidatePath("/");
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/");
}
