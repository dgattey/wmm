"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDollar, formatDate } from "@/lib/utils";
import type { StoredPortfolioSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { navigateWithViewTransition } from "@/lib/viewTransitionNav";

interface PortfolioLibraryNavProps {
  portfolios: StoredPortfolioSummary[];
  activePortfolioId?: string | null;
  onRemovePortfolio?: (portfolioId: string) => void;
  onRenamePortfolio?: (portfolioId: string, name: string) => void;
  className?: string;
}

export function PortfolioLibraryNav({
  portfolios,
  activePortfolioId,
  onRemovePortfolio,
  onRenamePortfolio,
  className,
}: PortfolioLibraryNavProps) {
  if (portfolios.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          Your portfolios
        </p>
        <h2 className="mt-1 text-xl font-semibold text-text-primary md:text-2xl">
          Pick up where you left off
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {portfolios.map((portfolio) => (
          <PortfolioTile
            key={portfolio.id}
            portfolio={portfolio}
            isActive={portfolio.id === activePortfolioId}
            onRemove={onRemovePortfolio}
            onRename={onRenamePortfolio}
          />
        ))}
      </div>
    </section>
  );
}

interface PortfolioTileProps {
  portfolio: StoredPortfolioSummary;
  isActive: boolean;
  onRemove?: (portfolioId: string) => void;
  onRename?: (portfolioId: string, name: string) => void;
}

function PortfolioTile({
  portfolio,
  isActive,
  onRemove,
  onRename,
}: PortfolioTileProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(portfolio.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function handleStartEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(portfolio.name);
  }

  function handleCommitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== portfolio.name && onRename) {
      onRename(portfolio.id, trimmed);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleCommitEdit();
    } else if (e.key === "Escape") {
      setEditValue(portfolio.name);
      setIsEditing(false);
    }
  }

  function handleRemoveClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.(portfolio.id);
  }

  function handleOpenClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    const href = `/portfolio/${portfolio.id}`;
    navigateWithViewTransition("forward", () => {
      router.push(href);
    });
  }

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm font-semibold text-text-primary outline-none focus:border-accent"
              aria-label="Rename portfolio"
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {portfolio.name}
              </p>
              {onRename && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="relative z-10 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-primary focus:opacity-100 focus:outline-none"
                  aria-label={`Rename ${portfolio.name}`}
                  title="Rename portfolio"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <p className="mt-1 truncate text-xs text-text-muted">
            {portfolio.sourceFileName}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Uploaded {formatDate(portfolio.uploadedAt)}
          </p>
        </div>
        <div className="h-8 w-8 shrink-0" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-text-muted">
        <span>{portfolio.positionCount} positions</span>
        <span>
          {typeof portfolio.totalValue === "number"
            ? formatDollar(portfolio.totalValue)
            : "Needs refresh"}
        </span>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-4 transition-colors",
        isActive
          ? "border-accent bg-accent-bg/60"
          : "border-border/70 bg-bg/70 hover:border-accent/40 hover:bg-surface-hover/60"
      )}
    >
      {isEditing ? (
        <div className="block min-h-full">{cardContent}</div>
      ) : (
        <Link
          href={`/portfolio/${portfolio.id}`}
          onClick={handleOpenClick}
          className="block min-h-full cursor-pointer after:absolute after:inset-0 after:content-['']"
          aria-label={`Open ${portfolio.name}`}
        >
          {cardContent}
        </Link>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={handleRemoveClick}
          className="absolute right-3 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
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
  );
}
