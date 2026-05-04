"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
};

export function PasswordField({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={cn("field-base pr-24 sm:pr-28", error && "border-red-300 focus:border-red-400")}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className={cn(
          "absolute right-2 top-1/2 inline-flex h-9 -translate-y-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900",
          visible && "border-slate-300 bg-white",
        )}
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        title={visible ? "Скрыть пароль" : "Показать пароль"}
      >
        {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
        <span className="hidden text-xs font-semibold sm:inline">
          {visible ? "Скрыть" : "Показать"}
        </span>
      </button>
    </div>
  );
}
