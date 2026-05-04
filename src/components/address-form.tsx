"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AddressInput, UserAddress } from "@/lib/account-types";
import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { addressInputSchema } from "@/lib/validation-schemas";
import { Button } from "@/components/ui/button";

type AddressFormProps = {
  initialAddress?: UserAddress | null;
  onSubmit: (input: AddressInput, isDefault: boolean) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  defaultChecked?: boolean;
  showDefaultToggle?: boolean;
};

type AddressErrors = Partial<Record<keyof AddressInput | "form", string>>;

const emptyAddress: AddressInput = {
  country: "",
  city: "",
  street: "",
  house: "",
  apartment: "",
  postalCode: "",
  recipient: "",
  recipientPhone: "",
  courierComment: "",
};

export function AddressForm({
  initialAddress,
  onSubmit,
  onCancel,
  submitLabel = "Сохранить адрес",
  defaultChecked = false,
  showDefaultToggle = true,
}: AddressFormProps) {
  const initialValues = useMemo(
    () => ({
      country: initialAddress?.country ?? emptyAddress.country,
      city: initialAddress?.city ?? emptyAddress.city,
      street: initialAddress?.street ?? emptyAddress.street,
      house: initialAddress?.house ?? emptyAddress.house,
      apartment: initialAddress?.apartment ?? emptyAddress.apartment,
      postalCode: initialAddress?.postalCode ?? emptyAddress.postalCode,
      recipient: initialAddress?.recipient ?? emptyAddress.recipient,
      recipientPhone: initialAddress?.recipientPhone ?? emptyAddress.recipientPhone,
      courierComment: initialAddress?.courierComment ?? emptyAddress.courierComment,
    }),
    [initialAddress],
  );
  const [values, setValues] = useState<AddressInput>(initialValues);
  const [isDefault, setIsDefault] = useState(initialAddress?.isDefault ?? defaultChecked);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<AddressErrors>({});

  useEffect(() => {
    setValues(initialValues);
    setIsDefault(initialAddress?.isDefault ?? defaultChecked);
    setErrors({});
  }, [defaultChecked, initialAddress?.id, initialAddress?.isDefault, initialValues]);

  const updateField = <Key extends keyof AddressInput>(key: Key, value: AddressInput[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const normalizedValues = addressInputSchema.parse(values);
      setErrors({});
      await onSubmit(normalizedValues, isDefault);

      if (!initialAddress) {
        setValues(emptyAddress);
        setIsDefault(defaultChecked);
      }
    } catch (error) {
      const fieldErrors = getZodFieldErrors<keyof AddressInput>(error);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      setErrors({
        form: getErrorMessage(error, "Не удалось сохранить адрес."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="label-base">
          <span className="label-title">Страна</span>
          <input
            value={values.country}
            onChange={(event) => updateField("country", event.target.value)}
            maxLength={120}
            className={`field-base ${errors.country ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.country ? <span className="error-text">{errors.country}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Город</span>
          <input
            value={values.city}
            onChange={(event) => updateField("city", event.target.value)}
            maxLength={120}
            className={`field-base ${errors.city ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.city ? <span className="error-text">{errors.city}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Улица</span>
          <input
            value={values.street}
            onChange={(event) => updateField("street", event.target.value)}
            maxLength={120}
            className={`field-base ${errors.street ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.street ? <span className="error-text">{errors.street}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Дом</span>
          <input
            value={values.house}
            onChange={(event) => updateField("house", event.target.value)}
            maxLength={120}
            className={`field-base ${errors.house ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.house ? <span className="error-text">{errors.house}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Квартира / офис</span>
          <input
            value={values.apartment}
            onChange={(event) => updateField("apartment", event.target.value)}
            maxLength={120}
            className="field-base"
          />
        </label>

        <label className="label-base">
          <span className="label-title">Индекс</span>
          <input
            value={values.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
            maxLength={20}
            className={`field-base ${errors.postalCode ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.postalCode ? <span className="error-text">{errors.postalCode}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Получатель</span>
          <input
            value={values.recipient}
            onChange={(event) => updateField("recipient", event.target.value)}
            maxLength={120}
            className={`field-base ${errors.recipient ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.recipient ? <span className="error-text">{errors.recipient}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Телефон получателя</span>
          <input
            value={values.recipientPhone}
            onChange={(event) => updateField("recipientPhone", event.target.value)}
            inputMode="tel"
            maxLength={20}
            className={`field-base ${errors.recipientPhone ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.recipientPhone ? <span className="error-text">{errors.recipientPhone}</span> : null}
        </label>

        <label className="label-base sm:col-span-2">
          <span className="label-title">Комментарий курьеру</span>
          <textarea
            value={values.courierComment}
            onChange={(event) => updateField("courierComment", event.target.value)}
            maxLength={280}
            className="field-base textarea-base"
            placeholder="Подъезд, этаж, код домофона или пожелания по доставке"
          />
        </label>
      </div>

      {showDefaultToggle ? (
        <label className="mt-5 inline-flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          Использовать как адрес по умолчанию
        </label>
      ) : null}

      {errors.form ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="secondary" className="w-full rounded-2xl sm:w-auto" onClick={onCancel}>
            Отмена
          </Button>
        ) : null}
        <Button type="submit" className="w-full rounded-2xl sm:w-auto" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Сохраняем
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
