"use client";

import { Loader2, Save, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminUserDetail, AdminUserRole, AdminUserStatus } from "@/lib/admin-types";
import {
  adminUserRoleOptions,
  adminUserStatusOptions,
} from "@/lib/admin-constants";
import { adminUserUpdateSchema } from "@/lib/validation-schemas";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  birthday: string;
  favoriteDriver: string;
  favoriteTeam: string;
};

type UserFormErrors = Partial<Record<keyof UserFormValues | "form", string>>;

function initialValues(user: AdminUserDetail): UserFormValues {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    status: user.status,
    birthday: user.birthday ?? "",
    favoriteDriver: user.favoriteDriver ?? "",
    favoriteTeam: user.favoriteTeam ?? "",
  };
}

export function AdminUserForm({
  user,
  currentAdminId,
}: {
  user: AdminUserDetail;
  currentAdminId: string;
}) {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.pushToast);
  const [values, setValues] = useState<UserFormValues>(() => initialValues(user));
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const isSelf = user.id === currentAdminId;

  const updateField = <Key extends keyof UserFormValues>(key: Key, value: UserFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const saveUser = async (nextValues: UserFormValues) => {
    const input = adminUserUpdateSchema.parse({
      ...nextValues,
      birthday: nextValues.birthday || null,
      favoriteDriver: nextValues.favoriteDriver || null,
      favoriteTeam: nextValues.favoriteTeam || null,
    });
    const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Не удалось сохранить пользователя.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await saveUser(values);
      setErrors({});
      pushToast("Пользователь сохранён", "success");
      router.refresh();
    } catch (error) {
      const fieldErrors = getZodFieldErrors<keyof UserFormValues>(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        setErrors({ form: getErrorMessage(error, "Не удалось сохранить пользователя.") });
      }
      pushToast(getErrorMessage(error, "Не удалось сохранить пользователя."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Отключить пользователя? Его заказы и адреса останутся в базе.")) {
      return;
    }

    setIsDisabling(true);

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
        headers: buildCsrfHeaders(),
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Не удалось отключить пользователя.");
      }

      setValues((current) => ({ ...current, status: "DISABLED" }));
      pushToast("Пользователь отключён", "success");
      router.refresh();
    } catch (error) {
      pushToast(getErrorMessage(error, "Не удалось отключить пользователя."), "error");
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Основные данные</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Роли и статусы сохраняются только после серверной проверки прав.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!isSelf && values.status !== "DISABLED" ? (
            <Button type="button" variant="secondary" className="rounded-2xl" disabled={isDisabling} onClick={handleDisable}>
              {isDisabling ? <Loader2 className="size-4 animate-spin" /> : <UserX className="size-4" />}
              Отключить
            </Button>
          ) : null}
          <Button type="submit" className="rounded-2xl" disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSaving ? "Сохраняем" : "Сохранить"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="label-base">
          <span className="label-title">Имя</span>
          <input
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={`field-base ${errors.name ? "border-red-300 focus:border-red-400" : ""}`}
            maxLength={80}
          />
          {errors.name ? <span className="error-text">{errors.name}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Email</span>
          <input
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={`field-base ${errors.email ? "border-red-300 focus:border-red-400" : ""}`}
            maxLength={254}
            type="email"
          />
          {errors.email ? <span className="error-text">{errors.email}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Телефон</span>
          <input
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={`field-base ${errors.phone ? "border-red-300 focus:border-red-400" : ""}`}
            inputMode="tel"
            maxLength={20}
          />
          {errors.phone ? <span className="error-text">{errors.phone}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Дата рождения</span>
          <input
            value={values.birthday}
            onChange={(event) => updateField("birthday", event.target.value)}
            className={`field-base ${errors.birthday ? "border-red-300 focus:border-red-400" : ""}`}
            type="date"
          />
          {errors.birthday ? <span className="error-text">{errors.birthday}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Роль</span>
          <select
            value={values.role}
            onChange={(event) => updateField("role", event.target.value as AdminUserRole)}
            className="field-base"
            disabled={isSelf}
          >
            {adminUserRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isSelf ? <span className="helper-text">Свою admin-роль нельзя снять из этой формы.</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Статус</span>
          <select
            value={values.status}
            onChange={(event) => updateField("status", event.target.value as AdminUserStatus)}
            className="field-base"
            disabled={isSelf}
          >
            {adminUserStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isSelf ? <span className="helper-text">Свой аккаунт нельзя отключить из админки.</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Любимый пилот</span>
          <input
            value={values.favoriteDriver}
            onChange={(event) => updateField("favoriteDriver", event.target.value)}
            className="field-base"
            maxLength={80}
          />
        </label>

        <label className="label-base">
          <span className="label-title">Любимая команда</span>
          <input
            value={values.favoriteTeam}
            onChange={(event) => updateField("favoriteTeam", event.target.value)}
            className="field-base"
            maxLength={80}
          />
        </label>
      </div>

      {errors.form ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}
    </form>
  );
}
