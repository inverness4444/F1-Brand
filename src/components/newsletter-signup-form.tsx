"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { newsletterSubscriptionSchema } from "@/lib/validation-schemas";
import { trackAnalyticsEvent } from "@/services/analytics-service";
import { useToastStore } from "@/store/toast-store";

type NewsletterSignupFormProps = {
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  placeholder?: string;
  submitLabel?: string;
  submittingLabel?: string;
  successMessage?: string;
  source?: string;
};

function defaultNewsletterSource(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return "homepage";
  }

  if (pathname.startsWith("/account")) {
    return "account";
  }

  return pathname.split("/").filter(Boolean)[0] ?? "homepage";
}

export function NewsletterSignupForm({
  className,
  inputClassName,
  buttonClassName,
  placeholder = "Ваш e-mail",
  submitLabel = "Подписаться",
  submittingLabel = "Отправляем",
  successMessage = "Спасибо, вы подписались на новости Velocity Club",
  source,
}: NewsletterSignupFormProps) {
  const pathname = usePathname();
  const pushToast = useToastStore((state) => state.pushToast);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(successMessage);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitted(false);

    try {
      const payload = newsletterSubscriptionSchema.parse({
        email,
        source: source ?? defaultNewsletterSource(pathname),
      });
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildCsrfHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; alreadySubscribed?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Не удалось оформить подписку.");
      }

      const nextMessage = result?.message ?? successMessage;
      setEmail(payload.email);
      setMessage(nextMessage);
      setError("");
      setSubmitted(true);
      pushToast(nextMessage, nextMessage === "Вы уже подписаны" ? "info" : "success");
      trackAnalyticsEvent({
        eventType: result?.alreadySubscribed ? "newsletter_subscribe_duplicate" : "newsletter_subscribe_success",
        entityType: "newsletter",
        entityName: "Подписка на новости",
        metadata: {
          source: payload.source,
        },
      });
    } catch (nextError) {
      const fieldErrors = getZodFieldErrors<"email">(nextError);
      setError(fieldErrors.email ?? getErrorMessage(nextError, "Не удалось оформить подписку."));
      setSubmitted(false);
      trackAnalyticsEvent({
        eventType: "newsletter_subscribe_error",
        entityType: "newsletter",
        entityName: "Подписка на новости",
        metadata: {
          source: source ?? defaultNewsletterSource(pathname),
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className={className}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder={placeholder}
          className={inputClassName}
          aria-invalid={error ? true : false}
        />
        <button type="submit" className={buttonClassName} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {submitted && !error ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
    </div>
  );
}
