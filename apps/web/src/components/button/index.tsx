import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent)] text-[var(--text-primary)] hover:brightness-110 focus-visible:outline-[var(--accent)]",
    ghost:
      "border border-[var(--line)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--panel-soft)] focus-visible:outline-[var(--text-secondary)]"
  };

  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${className}`.trim()}
    />
  );
}
