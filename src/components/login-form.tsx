"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { safeRedirectPath } from "@/lib/security-utils";
import { loginPayloadSchema } from "@/lib/validation-schemas";
import { useMounted } from "@/hooks/use-mounted";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";

export function LoginForm({ redirectPath }: { redirectPath?: string | null }) {
  const router = useRouter();
  const mounted = useMounted();
  const safeRedirectTarget = safeRedirectPath(redirectPath);
  const currentUser = useAuthStore((state) => state.currentUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const pushToast = useToastStore((state) => state.pushToast);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  useEffect(() => {
    if (isHydrated && currentUser) {
      router.replace(safeRedirectTarget);
    }
  }, [currentUser, isHydrated, router, safeRedirectTarget]);

  if (!mounted) {
    return (
      <div className="card-panel mx-auto w-full max-w-xl p-6 sm:p-8">
        <p className="section-kicker">Аккаунт</p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-slate-900">
          Войти в магазин
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Подготавливаем форму входа.
        </p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const payload = loginPayloadSchema.parse({ email, password, rememberMe });
      setErrors({});
      await login(payload);
      pushToast("Вход выполнен");
      router.replace(safeRedirectTarget);
    } catch (error) {
      const fieldErrors = getZodFieldErrors<"email" | "password">(error);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      setErrors({
        form: getErrorMessage(error, "Не удалось выполнить вход."),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel mx-auto w-full max-w-xl p-6 sm:p-8">
      <div>
        <p className="section-kicker">Аккаунт</p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-slate-900">
          Войти в магазин
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Сохраните избранное, адреса доставки и историю заказов в одном кабинете.
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
            className={`field-base ${errors.email ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.email ? <span className="error-text">{errors.email}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Пароль</span>
          <PasswordField
            id="login-password"
            name="password"
            value={password}
            onChange={setPassword}
            placeholder="Введите пароль"
            autoComplete="current-password"
            error={errors.password}
          />
          {errors.password ? <span className="error-text">{errors.password}</span> : null}
        </label>

        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Запомнить меня
          </label>
          <Link href="/forgot-password" className="font-medium text-red-600 transition hover:text-red-700">
            Забыли пароль?
          </Link>
        </div>

        {errors.form ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.form}
          </div>
        ) : null}

        <Button type="submit" fullWidth className="rounded-2xl" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Входим
            </>
          ) : (
            "Войти"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-red-600 transition hover:text-red-700">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
