import type { SiteNotification } from "@/lib/account-types";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { siteNotificationsSchema } from "@/lib/validation-schemas";

async function parseNotifications(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { notifications?: unknown; unreadCount?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить уведомления.");
  }

  return {
    notifications: siteNotificationsSchema.parse(payload?.notifications ?? []),
    unreadCount: Number(payload?.unreadCount ?? 0),
  };
}

export const notificationService = {
  async list() {
    const response = await fetch("/api/account/notifications", {
      cache: "no-store",
      credentials: "include",
    });

    if (response.status === 401) {
      return { notifications: [] as SiteNotification[], unreadCount: 0 };
    }

    return parseNotifications(response);
  },

  async markAsRead(notificationId: string) {
    const response = await fetch(`/api/account/notifications/${encodeURIComponent(notificationId)}`, {
      method: "PATCH",
      headers: buildCsrfHeaders(),
      credentials: "include",
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Не удалось отметить уведомление прочитанным.");
    }
  },
};
