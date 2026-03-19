"use client";

import { FetchStatusBadge } from "./primitives/FetchStatusBadge";

interface PortfolioLoadingStateProps {
  enableIntroAnimation?: boolean;
  error?: string | null;
}

export function PortfolioLoadingState({
  enableIntroAnimation = true,
  error,
}: PortfolioLoadingStateProps) {
  return (
    <div
      className={[
        "flex min-h-0 flex-1 flex-col p-6 max-w-[1400px] mx-auto w-full",
        enableIntroAnimation ? "animate-fade-in" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-medium text-text-muted">Your portfolio</div>
          <div className="mt-2 skeleton h-9 w-48" />
        </div>
        {error && <FetchStatusBadge error={error} hasData={false} />}
      </div>
      <div className="skeleton h-[400px] rounded-xl mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
