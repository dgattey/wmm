import { cn } from "@/lib/utils";
import { ChevronLeftIcon } from "../icons";
import { SkeletonPulse } from "./SkeletonPulse";

interface DashboardHeaderSkeletonProps {
  portfolioName?: string;
  isMobile?: boolean;
}

/**
 * Matches the exact layout of DashboardHeader: back button, title row,
 * status area on the right, and value/gain-loss row below.
 */
export function DashboardHeaderSkeleton({
  portfolioName,
  isMobile = false,
}: DashboardHeaderSkeletonProps) {
  return (
    <div
      className={cn(
        "relative z-10 max-w-[1400px] mx-auto py-5",
        isMobile ? "px-4" : "px-6"
      )}
    >
      {/* Top row: back button + title + status */}
      <div className="mb-6 flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* Back button */}
          <div
            className={cn(
              "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-border/70",
              "bg-surface text-text-muted shadow-sm"
            )}
          >
            <ChevronLeftIcon />
          </div>
          {/* Title area */}
          <div className="min-w-0 flex-1">
            <span className="shrink-0 text-sm font-medium text-text-muted">
              Your portfolio
            </span>
            {portfolioName ? (
              <h1 className="-ml-1.5 truncate px-1.5 py-0.5 text-sm font-semibold text-text-primary md:text-base">
                {portfolioName}
              </h1>
            ) : (
              <SkeletonPulse className="mt-1 h-5 w-44" />
            )}
          </div>
        </div>

        {/* Status area (top-right) */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <SkeletonPulse className="h-4 w-28" />
          <SkeletonPulse className="h-7 w-20 !rounded-full" />
        </div>
      </div>

      {/* Value + gain/loss row */}
      <div
        className={cn(
          "gap-x-6 gap-y-3",
          isMobile ? "flex flex-col items-start" : "flex flex-wrap items-end"
        )}
      >
        {/* Total value */}
        <div className="min-w-fit shrink-0">
          <SkeletonPulse
            className={cn(
              isMobile ? "h-10 w-40" : "h-12 w-48 md:h-14 md:w-56"
            )}
          />
          <p className="mt-1 text-xs text-text-muted">Current market value</p>
        </div>
        {/* Gain/loss */}
        <div className={cn("min-w-0", !isMobile && "self-end")}>
          <SkeletonPulse
            className={cn(isMobile ? "h-7 w-32" : "h-8 w-40 md:h-9")}
          />
          <p className="mt-1 text-xs text-text-muted">
            Unrealized gain / return on cost basis
          </p>
        </div>
      </div>
    </div>
  );
}
