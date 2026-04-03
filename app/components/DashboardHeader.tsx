"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type {
  ActivePortfolioSummary,
  PortfolioData,
} from "@/lib/types";
import { formatDollar, formatHeaderCurrency } from "@/lib/utils";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { GainLoss } from "./primitives/GainLoss";
import { FetchStatusBadge } from "./primitives/FetchStatusBadge";
import { cn } from "@/lib/utils";
import {
  portfolioViewTransitionTitle,
  portfolioViewTransitionValue,
} from "@/lib/portfolioViewTransition";
import { ChevronLeftIcon, PencilIcon, RefreshIcon, SearchIcon, XIcon } from "./icons";

interface DashboardHeaderProps {
  portfolioData: PortfolioData;
  portfolioName: string;
  portfolioId?: string;
  onRenamePortfolio?: (portfolioId: string, name: string) => void;
  onBackToPicker: () => void;
  activeSummary: ActivePortfolioSummary | null;
  isMobile: boolean;
  /** When true, search bar is stuck under the header — compact totals and hide metric captions. */
  isSearchDocked: boolean;
  isLoading: boolean;
  enableIntroAnimation: boolean;
  enableValueAnimations: boolean;
  fetchError?: string | null;
  onRefresh?: () => void;
  isRefreshing: boolean;
  viewTransitionPortfolioId?: string;
}

export function DashboardHeader({
  portfolioData,
  portfolioName,
  portfolioId,
  onRenamePortfolio,
  onBackToPicker,
  activeSummary,
  isMobile,
  isSearchDocked,
  isLoading,
  enableIntroAnimation,
  enableValueAnimations,
  fetchError,
  onRefresh,
  isRefreshing,
  viewTransitionPortfolioId,
}: DashboardHeaderProps) {
  const { summary, lastUpdated } = portfolioData;
  const timeAgo = useTimeAgo(lastUpdated);
  const [hoveredTooltip, setHoveredTooltip] = useState<"value" | "gain" | null>(null);
  const valueTotalsAnchorRef = useRef<HTMLDivElement | null>(null);
  const gainTotalsAnchorRef = useRef<HTMLDivElement | null>(null);
  const [headerTooltipPos, setHeaderTooltipPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(portfolioName);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const canRename = Boolean(portfolioId && onRenamePortfolio);

  useEffect(() => {
    setEditNameValue(portfolioName);
  }, [portfolioName]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useLayoutEffect(() => {
    if (!hoveredTooltip) {
      setHeaderTooltipPos(null);
      return;
    }

    const anchor =
      hoveredTooltip === "value" ? valueTotalsAnchorRef.current : gainTotalsAnchorRef.current;
    if (!anchor) return;

    const update = () => {
      const r = anchor.getBoundingClientRect();
      setHeaderTooltipPos({ left: r.left, top: r.bottom + 6 });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(anchor);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [hoveredTooltip]);

  function handleStartEditName() {
    setIsEditingName(true);
    setEditNameValue(portfolioName);
  }

  function handleCommitNameEdit() {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== portfolioName && portfolioId && onRenamePortfolio) {
      onRenamePortfolio(portfolioId, trimmed);
    }
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCommitNameEdit();
    else if (e.key === "Escape") {
      setEditNameValue(portfolioName);
      setIsEditingName(false);
    }
  }

  const displayValue = activeSummary?.value ?? summary.totalValue;
  const displayGainLoss = activeSummary?.gainLoss ?? summary.totalGainLoss;
  const displayGainLossPercent = activeSummary?.gainLossPercent ?? summary.totalGainLossPercent;

  return (
    <div
      className={cn(
        "relative z-10 max-w-[1400px] mx-auto py-5",
        isMobile ? "px-4" : "px-6"
      )}
    >
      <div
        className={cn(enableIntroAnimation && "animate-soft-rise")}
        style={{ "--enter-delay": "40ms" } as CSSProperties}
      >
        <div className="mb-6 flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBackToPicker}
              className={cn(
                "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-border/70",
                "bg-surface text-text-primary shadow-sm transition-all duration-200 cursor-pointer hover:bg-surface-hover hover-lift press-down",
                enableIntroAnimation && "animate-scale-in"
              )}
              title="Back to portfolios"
              aria-label="Back to portfolios"
            >
              <ChevronLeftIcon />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-sm font-medium text-text-muted">Your portfolio</span>
                {activeSummary && (
                  <span className="truncate text-sm text-text-muted">
                    — {activeSummary.label}
                  </span>
                )}
              </div>
              {isEditingName && canRename ? (
                <div className="-ml-1.5 inline-grid min-w-0 max-w-full">
                  <span
                    className="invisible col-start-1 row-start-1 whitespace-pre border border-transparent px-1.5 py-0.5 text-sm font-semibold md:text-base"
                    aria-hidden="true"
                  >
                    {editNameValue || "\u00A0"}
                  </span>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={handleCommitNameEdit}
                    onKeyDown={handleNameKeyDown}
                    className="col-start-1 row-start-1 block min-w-[4ch] rounded-lg border border-border bg-surface px-1.5 py-0.5 text-sm font-semibold text-text-primary outline-none focus:border-accent md:text-base"
                    aria-label="Rename portfolio"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={canRename ? handleStartEditName : undefined}
                  className={cn(
                    "-ml-1.5 flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-1.5 py-0.5 text-left",
                    canRename && "cursor-pointer hover:opacity-80"
                  )}
                  disabled={!canRename}
                  aria-label={canRename ? "Rename portfolio" : undefined}
                  title={canRename ? "Click to rename" : undefined}
                >
                  <h1
                    className="truncate text-sm font-semibold text-text-primary md:text-base"
                    style={
                      viewTransitionPortfolioId
                        ? ({ viewTransitionName: portfolioViewTransitionTitle(viewTransitionPortfolioId) } as CSSProperties)
                        : undefined
                    }
                  >
                    {portfolioName}
                  </h1>
                  {canRename && (
                    <PencilIcon className="text-text-muted opacity-70" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex shrink-0 flex-col items-end gap-1.5",
              enableIntroAnimation && "animate-soft-rise"
            )}
            style={{ "--enter-delay": "120ms" } as CSSProperties}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-text-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Data fetched {timeAgo}
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh data"
                title="Refresh quotes and holdings"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface px-3 py-1.5",
                  "text-xs font-medium text-text-primary shadow-sm transition-all duration-200 cursor-pointer",
                  "hover:bg-surface-hover hover-lift press-down",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <RefreshIcon className={cn(isRefreshing && "animate-spin")} />
                Refresh
              </button>
            )}
            {fetchError && (
              <FetchStatusBadge error={fetchError} hasData className="max-w-full" />
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Loading...
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            "gap-x-6 transition-[gap,row-gap] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            isSearchDocked ? "gap-y-1" : "gap-y-3",
            isMobile ? "flex flex-col items-start" : "flex flex-wrap items-end"
          )}
        >
          <div
            ref={valueTotalsAnchorRef}
            className="relative min-w-fit shrink-0"
            onMouseEnter={() => setHoveredTooltip("value")}
            onMouseLeave={() => setHoveredTooltip(null)}
            style={
              viewTransitionPortfolioId
                ? ({ viewTransitionName: portfolioViewTransitionValue(viewTransitionPortfolioId) } as CSSProperties)
                : undefined
            }
          >
            <AnimatedNumber
              value={displayValue}
              format={formatHeaderCurrency}
              animate={enableValueAnimations}
              className={cn(
                "block font-bold text-text-primary whitespace-nowrap transition-[font-size,line-height] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                isMobile
                  ? isSearchDocked
                    ? "text-[clamp(1.25rem,6vw,1.65rem)] leading-tight"
                    : "text-[clamp(2rem,10vw,2.6rem)]"
                  : isSearchDocked
                    ? "text-xl md:text-3xl leading-tight"
                    : "text-3xl md:text-5xl"
              )}
            />
            <p
              className={cn(
                "text-xs text-text-muted overflow-hidden transition-[max-height,opacity,margin-top] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                isSearchDocked ? "mt-0 max-h-0 opacity-0 pointer-events-none" : "mt-1 max-h-6 opacity-100"
              )}
              aria-hidden={isSearchDocked}
            >
              Current market value
            </p>
          </div>
          <div
            ref={gainTotalsAnchorRef}
            className={cn("relative min-w-0", !isMobile && "self-end")}
            onMouseEnter={() => setHoveredTooltip("gain")}
            onMouseLeave={() => setHoveredTooltip(null)}
          >
            <GainLoss
              dollar={displayGainLoss}
              percent={displayGainLossPercent}
              size={isMobile ? "sm" : "md"}
              className={cn(
                "transition-[font-size] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                isMobile
                  ? isSearchDocked
                    ? "text-sm"
                    : "text-lg"
                  : isSearchDocked
                    ? "text-base md:text-lg"
                    : "text-xl md:text-2xl"
              )}
              formatDollarValue={formatHeaderCurrency}
            />
            <p
              className={cn(
                "text-xs text-text-muted overflow-hidden transition-[max-height,opacity,margin-top] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                isSearchDocked ? "mt-0 max-h-0 opacity-0 pointer-events-none" : "mt-1 max-h-6 opacity-100"
              )}
              aria-hidden={isSearchDocked}
            >
              Unrealized gain / return on cost basis
            </p>
          </div>
        </div>
        {typeof document !== "undefined" &&
          hoveredTooltip &&
          headerTooltipPos &&
          createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[200] w-max rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-left text-xs leading-5 text-text-primary shadow-[var(--shadow-lg)]"
              style={{ left: headerTooltipPos.left, top: headerTooltipPos.top }}
            >
              {hoveredTooltip === "value"
                ? formatDollar(displayValue)
                : `${formatDollar(displayGainLoss)} / ${displayGainLossPercent.toFixed(2)}%`}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}

// === Dashboard search bar (extracted for clarity) ===

interface DashboardSearchBarProps {
  searchInput: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  visibleHoldingCount: number;
  isMobile: boolean;
  isSearchDocked: boolean;
}

export function DashboardSearchBar({
  searchInput,
  onSearchChange,
  onClearSearch,
  visibleHoldingCount,
  isMobile,
  isSearchDocked,
}: DashboardSearchBarProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex items-center gap-3",
        isMobile ? "px-4" : "px-6",
        "max-w-[1400px] mx-auto"
      )}
    >
      <div className={cn("relative min-w-0 flex-1", !isMobile && "max-w-xl lg:max-w-2xl")}>
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-text-muted"
        />
        <input
          type="text"
          role="searchbox"
          value={searchInput}
          onChange={onSearchChange}
          placeholder="Search by name or symbol"
          aria-label="Search portfolio"
          className={cn(
            "w-full rounded-xl border border-border py-2.5 pl-10 text-sm text-text-primary shadow-[var(--shadow-sm)]",
            isSearchDocked ? "bg-surface/92" : "bg-surface/95 backdrop-blur-xl",
            "outline-none transition-colors placeholder:text-text-muted hover:border-border/80 focus:border-border",
            searchInput.length > 0 ? "pr-10" : "pr-3"
          )}
        />
        {searchInput.length > 0 && (
          <button
            type="button"
            onClick={onClearSearch}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "inline-flex h-6 w-6 items-center justify-center rounded-full",
              "text-text-muted hover:text-text-primary hover:bg-surface-hover",
              "transition-colors cursor-pointer"
            )}
            aria-label="Clear search"
          >
            <XIcon />
          </button>
        )}
      </div>
      <p
        data-testid="inline-holdings-count"
        className="shrink-0 self-center text-center text-sm text-text-muted"
      >
        {visibleHoldingCount.toLocaleString()}{" "}
        {visibleHoldingCount === 1 ? "holding" : "holdings"}
      </p>
    </div>
  );
}

