"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { forgotPasswordPayloadSchema } from "@/lib/validation-schemas";
import { useMounted } from "@/hooks/use-mounted";
import { authService } from "@/services/auth-service";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const mounted = useMounted();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!mounted) {
    return (
      <div className="card-panel mx-auto w-full max-w-xl p-6 sm:p-8">
        <p className="section-kicker">Восстановление</p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-slate-900">
          Восстановить пароль
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Подготавливаем форму восстановления.
        </p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const payload = forgotPasswordPayloadSchema.parse({ email });
      setError("");
      authService.forgotPassword(payload);
      setSubmitted(true);
    } catch (nextError) {
      const fieldErrors = getZodFieldErrors<"email">(nextError);
      setError(fieldErrors.email ?? getErrorMessage(nextError, "Не удалось отправить запрос."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel mx-auto w-full max-w-xl p-6 sm:p-8">
      <div>
        <p className="section-kicker">Восстановление</p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-slate-900">
          Восстановить пароль
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Укажите email, на который зарегистрирован аккаунт магазина.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <label className="label-base">
          <span className="label-title">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            className={`field-base ${error ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {error ? <span className="error-text">{error}</span> : null}
        </label>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Если аккаунт с таким email существует, мы отправили инструкцию по восстановлению.
          </div>
        ) : null}

        <Button type="submit" fullWidth className="rounded-2xl" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Отправляем
            </>
          ) : (
            "Восстановить пароль"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Вспомнили пароль?{" "}
        <Link href="/login" className="font-semibold text-red-600 transition hover:text-red-700">
          Вернуться ко входу
        </Link>
      </p>
    </form>
  );
}
