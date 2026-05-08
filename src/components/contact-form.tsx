"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/toast-store";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const pushToast = useToastStore((state) => state.pushToast);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushToast("Сообщение отправлено. Мы скоро свяжемся с вами.");
    setForm(initialForm);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="label-base">
          <span className="label-title">Имя</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="field-base"
            autoComplete="name"
            required
          />
        </label>
        <label className="label-base">
          <span className="label-title">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="field-base"
            autoComplete="email"
            required
          />
        </label>
      </div>
      <label className="label-base">
        <span className="label-title">Тема обращения</span>
        <input
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          className="field-base"
          required
        />
      </label>
      <label className="label-base">
        <span className="label-title">Сообщение</span>
        <textarea
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          className="field-base textarea-base"
          required
        />
      </label>
      <div>
        <Button type="submit">Отправить</Button>
      </div>
    </form>
  );
}
