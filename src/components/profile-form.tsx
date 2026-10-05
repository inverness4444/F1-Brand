"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { LEGAL_VERSION } from "@/lib/legal";
import { useState } from "react";

import { favoriteDrivers2026, favoriteTeams2026 } from "@/lib/account-constants";
import type { AuthUser } from "@/lib/account-types";
import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { profilePayloadSchema } from "@/lib/validation-schemas";
import { userService } from "@/services/user-service";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";

type ProfileErrors = {
  name?: string;
  email?: string;
  phone?: string;
  form?: string;
};

export function ProfileForm({ user }: { user: AuthUser }) {
  const refresh = useAuthStore((state) => state.refresh);
  const pushToast = useToastStore((state) => state.pushToast);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [birthday, setBirthday] = useState(user.birthday ?? "");
  const [favoriteDriver, setFavoriteDriver] = useState(user.favoriteDriver ?? "");
  const [favoriteTeam, setFavoriteTeam] = useState(user.favoriteTeam ?? "");
  const [profileConsent, setProfileConsent] = useState(user.profileConsentGranted ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = profilePayloadSchema.parse({
        name,
        email,
        phone,
        birthday: profileConsent ? birthday || null : null,
        favoriteDriver: profileConsent ? favoriteDriver || null : null,
        favoriteTeam: profileConsent ? favoriteTeam || null : null,
        profileConsent,
        consentVersion: LEGAL_VERSION,
      });
      setErrors({});
      await userService.updateProfile(user.id, payload);
      await refresh();
      pushToast("Изменения сохранены");
    } catch (error) {
      const fieldErrors = getZodFieldErrors<"name" | "email" | "phone">(error);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      setErrors({
        form: getErrorMessage(error, "Не удалось сохранить изменения."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel p-5 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Профиль</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Обновите контактные данные и фанатские предпочтения для персонализации магазина.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="label-base">
          <span className="label-title">Имя</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
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
            inputMode="tel"
            maxLength={20}
            className={`field-base ${errors.phone ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.phone ? <span className="error-text">{errors.phone}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Дата рождения</span>
          <input
            type="date"
            disabled={!profileConsent}
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
            className="field-base"
          />
        </label>

        <label className="label-base">
          <span className="label-title">Любимый пилот</span>
          <select
            value={favoriteDriver}
            disabled={!profileConsent}
            onChange={(event) => setFavoriteDriver(event.target.value)}
            className="field-base"
          >
            <option value="">Не выбрано</option>
            {favoriteDrivers2026.map((driver) => (
              <option key={driver} value={driver}>
                {driver}
              </option>
            ))}
          </select>
        </label>

        <label className="label-base">
          <span className="label-title">Любимая команда</span>
          <select
            value={favoriteTeam}
            disabled={!profileConsent}
            onChange={(event) => setFavoriteTeam(event.target.value)}
            className="field-base"
          >
            <option value="">Не выбрано</option>
            {favoriteTeams2026.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-600">
        <input type="checkbox" checked={profileConsent} onChange={(event) => setProfileConsent(event.target.checked)} className="mt-1 size-4 shrink-0" />
        <span>Даю отдельное <Link href="/consent/profile" target="_blank" className="underline">согласие на персонализацию</Link> с использованием даты рождения, пилота и команды. Необязательно. Чтобы отозвать согласие и удалить эти поля, выключите его и сохраните профиль.</span>
      </label>
      {errors.form ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}

      <div className="mt-6 flex">
        <Button type="submit" className="w-full rounded-2xl sm:ml-auto sm:w-auto" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Сохраняем
            </>
          ) : (
            "Сохранить изменения"
          )}
        </Button>
      </div>
    </form>
  );
}
