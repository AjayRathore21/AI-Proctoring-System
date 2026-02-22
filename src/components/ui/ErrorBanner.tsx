import React from "react";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
    <span>{message}</span>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="text-red-300/60 hover:text-red-300 transition-colors shrink-0"
        aria-label="Dismiss error"
      >
        ✕
      </button>
    )}
  </div>
);
