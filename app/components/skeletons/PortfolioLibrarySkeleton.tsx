import { SkeletonPulse } from "./SkeletonPulse";

/**
 * Mirrors PortfolioLibraryNav layout so the homepage library card does not
 * pop in after IndexedDB resolves.
 */
export function PortfolioLibrarySkeleton() {
  return (
    <div
      className="space-y-4"
      data-testid="portfolio-library-skeleton"
      aria-busy="true"
      aria-label="Loading saved portfolios"
    >
      <div>
        <SkeletonPulse className="mb-2 h-3 w-28" />
        <SkeletonPulse className="h-7 w-[min(100%,18rem)] md:h-8" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PortfolioTileSkeleton />
        <PortfolioTileSkeleton />
      </div>
    </div>
  );
}

function PortfolioTileSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-bg/80 shadow-sm">
      <SkeletonPulse className="h-2 w-full rounded-none" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonPulse className="h-4 w-3/5 max-w-[12rem]" />
            <SkeletonPulse className="h-3 w-4/5 max-w-[14rem]" />
            <SkeletonPulse className="h-3 w-24" />
          </div>
          <SkeletonPulse className="h-8 w-8 shrink-0 rounded-full" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <SkeletonPulse className="h-3 w-24" />
          <div className="flex items-center gap-1">
            <SkeletonPulse className="h-6 w-[4.5rem]" />
            <SkeletonPulse className="h-4 w-4 shrink-0 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
