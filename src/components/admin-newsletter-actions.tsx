"use client";

import { Copy, Download, Loader2 } from "lucide-react";
import { useState } from "react";

import { getErrorMessage } from "@/lib/form-error-utils";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast-store";

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopySubscriberEmailButton({ email }: { email: string }) {
  const pushToast = useToastStore((state) => state.pushToast);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);

    try {
      await writeClipboard(email);
      pushToast("Email скопирован", "success");
    } catch (error) {
      pushToast(getErrorMessage(error, "Не удалось скопировать email."), "error");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isCopying}
      className="button-base button-secondary rounded-2xl"
    >
      {isCopying ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Copy className="size-4" />}
      Скопировать email
    </button>
  );
}

export function AdminNewsletterBulkActions({ activeCount }: { activeCount: number }) {
  const pushToast = useToastStore((state) => state.pushToast);
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const hasActiveSubscribers = activeCount > 0;

  const handleCopyAllActive = async () => {
    setIsCopyingAll(true);

    try {
      const response = await fetch("/api/admin/newsletter-subscribers?status=ACTIVE", {
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as
        | { error?: string; subscribers?: Array<{ email: string }> }
        | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Не удалось загрузить активных подписчиков.");
      }

      const emails = result?.subscribers?.map((subscriber) => subscriber.email).filter(Boolean) ?? [];

      if (emails.length === 0) {
        pushToast("Активных подписчиков пока нет", "info");
        return;
      }

      await writeClipboard(emails.join("\n"));
      pushToast("Активные email скопированы", "success");
    } catch (error) {
      pushToast(getErrorMessage(error, "Не удалось скопировать активные email."), "error");
    } finally {
      setIsCopyingAll(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleCopyAllActive}
        disabled={isCopyingAll || !hasActiveSubscribers}
        className="button-base button-secondary rounded-2xl"
      >
        {isCopyingAll ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Copy className="size-4" />}
        Скопировать все активные email
      </button>
      <a
        href="/api/admin/newsletter-subscribers?status=ACTIVE&format=csv"
        className={cn(
          "button-base button-primary rounded-2xl",
          !hasActiveSubscribers && "pointer-events-none opacity-50",
        )}
        aria-disabled={!hasActiveSubscribers}
      >
        <Download className="size-4" aria-hidden="true" />
        Скачать CSV
      </a>
    </div>
  );
}
