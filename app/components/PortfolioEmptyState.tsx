"use client";

import Link from "next/link";

interface PortfolioEmptyStateProps {
  title: string;
  description: string;
}

export function PortfolioEmptyState({
  title,
  description,
}: PortfolioEmptyStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-surface p-8 shadow-[var(--shadow-lg)]">
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Upload portfolios
          </Link>
        </div>
      </div>
    </div>
  );
}
