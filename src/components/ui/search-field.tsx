"use client";

import { Search } from "lucide-react";
import type { FocusEventHandler, FormEventHandler } from "react";

import { SECURITY_LIMITS } from "@/lib/security-utils";
import { cn } from "@/lib/utils";

export function SearchField({
  value,
  onChange,
  placeholder = "Search ...",
  className,
  inputClassName,
  iconClassName,
  onSubmit,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
}) {
  const buttonType = onSubmit ? "submit" : "button";
  const content = (
    <div
      className={cn(
        "flex min-h-[4.25rem] w-full min-w-0 items-center rounded-full border border-[#d9d9d4] bg-white pl-6 pr-4 shadow-[0_0_0_1px_rgba(17,17,17,0.02)]",
        className,
      )}
    >
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        autoComplete="off"
        spellCheck={false}
        maxLength={SECURITY_LIMITS.searchMaxLength}
        className={cn(
          "h-full min-w-0 w-full border-none bg-transparent pr-4 text-base font-medium text-[#111111] outline-none placeholder:text-[#8d8d88] sm:text-[1.15rem]",
          inputClassName,
        )}
        placeholder={placeholder}
      />
      <button
        type={buttonType}
        aria-label="Поиск"
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#111111] text-[#111111] transition hover:bg-[#111111] hover:text-white",
          iconClassName,
        )}
      >
        <Search className="size-5" />
      </button>
    </div>
  );

  if (!onSubmit) {
    return content;
  }

  return <form onSubmit={onSubmit} className="w-full">{content}</form>;
}
