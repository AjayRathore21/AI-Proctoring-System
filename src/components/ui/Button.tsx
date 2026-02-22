import React from "react";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "icon";
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all duration-150",
  secondary:
    "bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold px-6 py-2.5 rounded-xl border border-white/20 transition-all duration-150",
  danger:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all duration-150",
  ghost:
    "bg-transparent hover:bg-white/10 text-white/80 hover:text-white px-4 py-2 rounded-xl transition-all duration-150",
  icon:
    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...props
}) => (
  <button
    className={`${variantClasses[variant]} flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading ? <Spinner size="sm" /> : children}
  </button>
);
