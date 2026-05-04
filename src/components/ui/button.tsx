import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    fullWidth?: boolean;
  }
>;

export function buttonClassName({
  variant = "primary",
  fullWidth,
  className,
}: {
  variant?: ButtonProps["variant"];
  fullWidth?: boolean;
  className?: string;
}) {
  return cn(
    "button-base",
    fullWidth && "w-full",
    variant === "primary" && "button-primary",
    variant === "secondary" && "button-secondary",
    variant === "ghost" &&
      "border border-transparent bg-transparent text-[#111111] hover:border-[var(--line)] hover:bg-white",
    className,
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  fullWidth,
  ...props
}: ButtonProps) {
  return (
    <button
      type={props.type ?? "button"}
      className={buttonClassName({ variant, fullWidth, className })}
      {...props}
    >
      {children}
    </button>
  );
}
