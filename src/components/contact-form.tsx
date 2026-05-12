"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { contactFormSchema } from "@/lib/validation-schemas";
import { clientRateLimitService } from "@/services/client-rate-limit-service";
import { useToastStore } from "@/store/toast-store";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initialForm | "form", string>>>({});
  const pushToast = useToastStore((state) => state.pushToast);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const payload = contactFormSchema.parse(form);
      clientRateLimitService.assertAllowed("contact", payload.email);
      setErrors({});
      pushToast("Сообщение отправлено. Мы скоро свяжемся с вами.");
      setForm(initialForm);
    } catch (error) {
      const fieldErrors = getZodFieldErrors<keyof typeof initialForm>(error);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      setErrors({
        form: getErrorMessage(error, "Не удалось отправить сообщение."),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="label-base">
          <span className="label-title">Имя</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength={80}
            className={`field-base ${errors.name ? "border-red-300 focus:border-red-400" : ""}`}
            autoComplete="name"
            required
          />
          {errors.name ? <span className="error-text">{errors.name}</span> : null}
        </label>
        <label className="label-base">
          <span className="label-title">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            maxLength={254}
            className={`field-base ${errors.email ? "border-red-300 focus:border-red-400" : ""}`}
            autoComplete="email"
            inputMode="email"
            required
          />
          {errors.email ? <span className="error-text">{errors.email}</span> : null}
        </label>
      </div>
      <label className="label-base">
        <span className="label-title">Тема обращения</span>
        <input
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          maxLength={120}
          className={`field-base ${errors.subject ? "border-red-300 focus:border-red-400" : ""}`}
          required
        />
        {errors.subject ? <span className="error-text">{errors.subject}</span> : null}
      </label>
      <label className="label-base">
        <span className="label-title">Сообщение</span>
        <textarea
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          maxLength={4000}
          className={`field-base textarea-base ${errors.message ? "border-red-300 focus:border-red-400" : ""}`}
          required
        />
        {errors.message ? <span className="error-text">{errors.message}</span> : null}
      </label>
      {errors.form ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}
      <div>
        <Button type="submit">Отправить</Button>
      </div>
    </form>
  );
}
