"use client";

import { cn } from "@/lib/utils";

interface FetchStatusBadgeProps {
  error: string;
  hasData: boolean;
  className?: string;
}

export function FetchStatusBadge({
  error,
  hasData,
  className,
}: FetchStatusBadgeProps) {
  const label = hasData ? "Live data issue" : "Live data unavailable";
  const tooltip = hasData
    ? `Latest live refresh failed. Showing the last available portfolio snapshot. ${error}`
    : `Unable to load live portfolio data yet. ${error}`;

  return (
    <div className={cn("group relative inline-flex", className)}>
      <div
        tabIndex={0}
        role="status"
        aria-label={label}
        title={tooltip}
        className={cn(
          "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-2",
          "cursor-help text-sm font-medium shadow-sm outline-none transition-colors duration-200",
          "border-amber-200/70 bg-amber-50 text-amber-800 hover:bg-amber-100",
          "focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
          "dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15",
          "dark:focus-visible:ring-amber-500/60 dark:focus-visible:ring-offset-surface"
        )}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
        <span>{label}</span>
      </div>

      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute right-0 bottom-full z-[100] mb-2 w-72 rounded-xl border border-border/80 bg-surface px-3 py-2",
          "text-left text-xs leading-5 text-text-primary shadow-[var(--shadow-lg)]",
          "opacity-0 -translate-y-1 transition-all duration-150",
          "group-hover:translate-y-0 group-hover:opacity-100",
          "group-focus-within:translate-y-0 group-focus-within:opacity-100",
          "group-hover:-translate-y-0 group-focus-within:-translate-y-0"
        )}
      >
        {tooltip}
      </div>
    </div>
  );
}
