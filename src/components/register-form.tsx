"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { registerFormSchema } from "@/lib/validation-schemas";
import { useMounted } from "@/hooks/use-mounted";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";

type RegisterErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  acceptedLegal?: string;
  form?: string;
};

export function RegisterForm() {
  const router = useRouter();
  const mounted = useMounted();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const register = useAuthStore((state) => state.register);
  const pushToast = useToastStore((state) => state.pushToast);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  useEffect(() => {
    if (isHydrated && currentUser) {
      router.replace("/account");
    }
  }, [currentUser, isHydrated, router]);

  if (!mounted) {
    return (
      <div className="card-panel mx-auto w-full max-w-2xl p-6 sm:p-8">
        <p className="section-kicker">Регистрация</p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-slate-900">
          Создать аккаунт
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Подготавливаем форму регистрации.
        </p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const { confirmPassword: _confirmPassword, ...payload } = registerFormSchema.parse({
        name,
        email,
        phone,
        password,
        confirmPassword,
        acceptedLegal,
      });
      void _confirmPassword;

      setErrors({});
      await register(payload);
      pushToast("Аккаунт создан");
      router.replace("/account");
    } catch (error) {
      const fieldErrors = getZodFieldErrors<
        "name" | "email" | "phone" | "password" | "confirmPassword" | "acceptedLegal"
      >(error);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      setErrors({
        form: getErrorMessage(error, "Не удалось создать аккаунт."),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel mx-auto w-full max-w-2xl p-6 sm:p-8">
      <div>
        <p className="section-kicker">Регистрация</p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-slate-900">
          Создать аккаунт
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Оформляйте заказы быстрее, храните адреса и собирайте избранное по любимым пилотам и командам.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="label-base sm:col-span-2">
          <span className="label-title">Имя</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Иван Петров"
            autoComplete="name"
            maxLength={80}
            className={`field-base ${errors.name ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.name ? <span className="error-text">{errors.name}</span> : null}
        </label>

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
          <span className="label-title">Телефон</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 (999) 123-45-67"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            className={`field-base ${errors.phone ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.phone ? <span className="error-text">{errors.phone}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Пароль</span>
          <PasswordField
            id="register-password"
            name="password"
            value={password}
            onChange={setPassword}
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            maxLength={128}
            error={errors.password}
          />
          {errors.password ? <span className="error-text">{errors.password}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Подтвердите пароль</span>
          <PasswordField
            id="register-confirm-password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Повторите пароль"
            autoComplete="new-password"
            maxLength={128}
            error={errors.confirmPassword}
          />
          {errors.confirmPassword ? <span className="error-text">{errors.confirmPassword}</span> : null}
        </label>
      </div>

      <div className="mt-6 space-y-4">
        <label className="inline-flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={acceptedLegal}
            onChange={(event) => setAcceptedLegal(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span>
            Я согласен с политикой конфиденциальности и публичной офертой.
          </span>
        </label>
        {errors.acceptedLegal ? <span className="error-text block">{errors.acceptedLegal}</span> : null}

        {errors.form ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.form}
          </div>
        ) : null}

        <Button type="submit" fullWidth className="rounded-2xl" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Создаём аккаунт
            </>
          ) : (
            "Создать аккаунт"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-red-600 transition hover:text-red-700">
          Войти
        </Link>
      </p>
    </form>
  );
}
