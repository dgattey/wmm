"use client";

import Link from "next/link";
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
    <section className={cn("space-y-4", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          Saved files
        </p>
        {portfolios.length > 0 && (
          <>
            <h2 className="mt-1 text-2xl font-semibold text-text-primary">
              Choose a portfolio to open
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Open any saved Fidelity export from here, or delete one you do not
              need. Recent uploads stay cached; older ones keep only the source
              positions.
            </p>
          </>
        )}
      </div>

      {portfolios.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-text-muted">
          No portfolios uploaded yet.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {portfolios.map((portfolio) => {
            const isActive = portfolio.id === activePortfolioId;

            return (
              <div
                key={portfolio.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  isActive
                    ? "border-accent bg-accent-bg/60"
                    : "border-border/70 bg-bg/70 hover:border-accent/40 hover:bg-surface-hover/60"
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
