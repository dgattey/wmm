import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { FetchStatusBadge } from "../primitives/FetchStatusBadge";
import { DashboardHeaderSkeleton } from "./DashboardHeaderSkeleton";
import { TreeMapSkeleton } from "./TreeMapSkeleton";
import { SearchBarSkeleton } from "./SearchBarSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { ToolbarSkeleton } from "./ToolbarSkeleton";

interface DashboardSkeletonProps {
  /** Portfolio name from localStorage — renders immediately when available */
  portfolioName?: string;
  isMobile?: boolean;
  error?: string | null;
  enableIntroAnimation?: boolean;
}

/**
 * Full-page skeleton that mirrors the Dashboard layout exactly so there
 * is no layout shift when the real content replaces it.
 */
export function DashboardSkeleton({
  portfolioName,
  isMobile = false,
  error,
  enableIntroAnimation = true,
}: DashboardSkeletonProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 pb-8",
        enableIntroAnimation && "animate-fade-in"
      )}
    >
      {/* Sticky Header — matches Dashboard <header> structure */}
      <header className="sticky-header sticky top-0 z-40">
        <DashboardHeaderSkeleton
          portfolioName={portfolioName}
          isMobile={isMobile}
        />
        {error && (
          <div className={cn("max-w-[1400px] mx-auto pb-2", isMobile ? "px-4" : "px-6")}>
            <FetchStatusBadge error={error} hasData={false} />
          </div>
        )}
      </header>

      {/* TreeMap — matches Dashboard treemap section */}
      <section
        className={cn(
          isMobile ? "pt-2" : "pt-6",
          "mb-6 max-w-[1400px] mx-auto overflow-x-clip",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "60ms" } as CSSProperties}
      >
        <TreeMapSkeleton isMobile={isMobile} />
      </section>

      {/* Mobile toolbar */}
      {isMobile && (
        <section
          className={cn(
            "px-4 mb-6 max-w-[1400px] mx-auto",
            enableIntroAnimation && "animate-soft-rise"
          )}
          style={{ "--enter-delay": "100ms" } as CSSProperties}
        >
          <ToolbarSkeleton isMobile />
        </section>
      )}

      {/* Search — matches Dashboard (z-[35] above shared backdrop) */}
      <section
        className={cn(
          "relative z-[35] max-w-[1400px] mx-auto overflow-x-clip",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "140ms" } as CSSProperties}
      >
        <div className="mb-4 py-3">
          <SearchBarSkeleton isMobile={isMobile} />
        </div>
      </section>

      <section
        className={cn(
          "max-w-[1400px] mx-auto overflow-x-clip",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "180ms" } as CSSProperties}
      >
        <TableSkeleton isMobile={isMobile} />
      </section>

      {/* Desktop toolbar */}
      {!isMobile && <ToolbarSkeleton />}
    </div>
  );
}
