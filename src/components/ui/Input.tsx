import React from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  className = "",
  ...props
}) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-white/80">
        {label}
      </label>
    )}
    <input
      id={id}
      className={`
        w-full px-4 py-2.5 rounded-xl
        bg-white/10 border border-white/20
        text-white placeholder-white/40
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        transition-all duration-150
        ${error ? "border-red-500 focus:ring-red-500" : ""}
        ${className}
      `}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);
