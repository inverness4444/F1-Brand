"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { newsletterSchema } from "@/lib/validation-schemas";
import { useToastStore } from "@/store/toast-store";

type NewsletterSignupFormProps = {
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  successMessage?: string;
};

export function NewsletterSignupForm({
  className,
  inputClassName,
  buttonClassName,
  successMessage = "Подписка оформлена. Проверьте почту для подтверждения.",
}: NewsletterSignupFormProps) {
  const pushToast = useToastStore((state) => state.pushToast);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = newsletterSchema.parse({ email });
      setEmail(payload.email);
      setError("");
      setSubmitted(true);
      pushToast("Вы подписались на рассылку");
    } catch (nextError) {
      const fieldErrors = getZodFieldErrors<"email">(nextError);
      setError(fieldErrors.email ?? getErrorMessage(nextError, "Не удалось оформить подписку."));
      setSubmitted(false);
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
          placeholder="Ваш e-mail"
          className={inputClassName}
          aria-invalid={error ? true : false}
        />
        <button type="submit" className={buttonClassName} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Отправляем
            </>
          ) : (
            "Подписаться"
          )}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {submitted && !error ? <p className="mt-3 text-sm text-emerald-800">{successMessage}</p> : null}
    </div>
  );
}
