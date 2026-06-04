"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { SiteNotification } from "@/lib/account-types";
import { formatDateTime } from "@/lib/account-utils";
import { notificationService } from "@/services/notification-service";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";

function notificationHref(notification: SiteNotification) {
  return notification.orderId ? `/account/orders/${notification.orderId}` : null;
}

export default function AccountNotificationsPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const pushToast = useToastStore((state) => state.pushToast);
  const [notifications, setNotifications] = useState<SiteNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    let ignore = false;
    setIsLoading(true);

    void notificationService
      .list()
      .then((result) => {
        if (!ignore) {
          setNotifications(result.notifications);
          setErrorMessage("");
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить уведомления.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const handleRead = async (notificationId: string) => {
    setSavingId(notificationId);

    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification,
        ),
      );
      pushToast("Уведомление отмечено как прочитанное", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Не удалось обновить уведомление.", "error");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Уведомления</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Важные события по заказам и внутренние сообщения магазина.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            <Bell className="size-4" />
            {unreadCount} непрочитанных
          </div>
        </div>
      </div>

      <div className="card-panel overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Загружаем уведомления...</div>
        ) : errorMessage ? (
          <div className="px-5 py-10 text-center text-sm text-red-600">{errorMessage}</div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Пока нет уведомлений.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const href = notificationHref(notification);

              return (
                <div
                  key={notification.id}
                  className={`flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between ${
                    notification.isRead ? "bg-white" : "bg-red-50/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                      {!notification.isRead ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          Новое
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{formatDateTime(notification.createdAt)}</span>
                      {href ? (
                        <Link href={href} className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                          Открыть заказ
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {!notification.isRead ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full rounded-2xl sm:w-auto"
                      disabled={savingId === notification.id}
                      onClick={() => handleRead(notification.id)}
                    >
                      <CheckCircle2 className="size-4" />
                      Прочитано
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
