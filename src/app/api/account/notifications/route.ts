import { getCurrentUser } from "@/lib/server/auth";
import { siteNotificationFromDb } from "@/lib/server/account-mappers";
import { apiError, noStoreJson } from "@/lib/server/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("unauthorized");
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.siteNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.siteNotification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    return noStoreJson({
      notifications: notifications.map(siteNotificationFromDb),
      unreadCount,
    });
  } catch (error) {
    return apiError(error, "Не удалось загрузить уведомления.");
  }
}
