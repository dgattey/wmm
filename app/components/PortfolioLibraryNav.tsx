"use client";

import { formatDollar } from "@/lib/utils";
import type { StoredPortfolioSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PortfolioLibraryNavProps {
  portfolios: StoredPortfolioSummary[];
  activePortfolioId?: string | null;
  onRemovePortfolio?: (portfolioId: string) => void;
  className?: string;
}

export function PortfolioLibraryNav({
  portfolios,
  activePortfolioId,
  onRemovePortfolio,
  className,
}: PortfolioLibraryNavProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-surface p-4 shadow-[var(--shadow)]",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">Saved portfolios</p>
          <p className="text-xs text-text-muted">
            Pick one to visualize or delete it here. Recent uploads stay cached,
            older ones keep only the source positions.
          </p>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-text-muted">
          No portfolios uploaded yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {portfolios.map((portfolio) => {
            const isActive = portfolio.id === activePortfolioId;

            return (
              <div
                key={portfolio.id}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  isActive
                    ? "border-accent bg-accent-bg/60"
                    : "border-border/70 bg-surface-hover/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/portfolio/${portfolio.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {portfolio.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-text-muted">
                      {portfolio.sourceFileName}
                    </p>
                  </Link>
                  {onRemovePortfolio && (
                    <button
                      type="button"
                      onClick={() => onRemovePortfolio(portfolio.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      aria-label={`Remove ${portfolio.name}`}
                      title={`Remove ${portfolio.name}`}
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
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="m19 6-1 14H6L5 6" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 text-xs text-text-muted">
                  <span>{portfolio.positionCount} positions</span>
                  <span>
                    {typeof portfolio.totalValue === "number"
                      ? formatDollar(portfolio.totalValue)
                      : "Needs refresh"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
