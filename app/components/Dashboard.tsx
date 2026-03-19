"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type {
  ActivePortfolioSummary,
  FundOption,
  PortfolioData,
  TreeMapNode,
  TableRow,
  FilterState,
  SortConfig,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import { hasActivePortfolioFilters } from "@/lib/portfolioFilters";
import { getFilteredRows } from "@/lib/portfolioSelectors";
import { formatDollar, formatHeaderCurrency } from "@/lib/utils";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { GainLoss } from "./primitives/GainLoss";
import { ResetFiltersButton } from "./primitives/ResetFiltersButton";
import { TreeMap } from "./TreeMap";
import { PortfolioTable } from "./PortfolioTable";
import { FloatingToolbar } from "./FloatingToolbar";
import { FetchStatusBadge } from "./primitives/FetchStatusBadge";
import { cn } from "@/lib/utils";
import { useIsStickyDocked } from "@/hooks/useIsStickyDocked";

interface DashboardProps {
  portfolioData: PortfolioData;
  portfolioName: string;
  portfolioId?: string;
  onRenamePortfolio?: (portfolioId: string, name: string) => void;
  filteredTreeMapNodes: TreeMapNode[];
  filteredRows: TableRow[];
  isMobile: boolean;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  onResetFilters: () => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  expandedRows: Set<string>;
  onToggleExpand: (symbol: string) => void;
  onBackToPicker: () => void;
  isLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  treeMapGrouping: TreeMapGrouping;
  onTreeMapGroupingChange: (mode: TreeMapGrouping) => void;
  selectedFunds: string[];
  onToggleFund: (symbol: string) => void;
  onClearFunds: () => void;
  fundOptions: FundOption[];
  activeSummary: ActivePortfolioSummary | null;
  treeMapWidth: number;
  treeMapHeight: number;
  enableIntroAnimation?: boolean;
  enableValueAnimations?: boolean;
  fetchError?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Dashboard({
  portfolioData,
  portfolioName,
  portfolioId,
  onRenamePortfolio,
  filteredTreeMapNodes,
  filteredRows,
  isMobile,
  filters,
  onFiltersChange,
  onResetFilters,
  sortConfig,
  onSort,
  expandedRows,
  onToggleExpand,
  onBackToPicker,
  isLoading,
  viewMode,
  onViewModeChange,
  treeMapGrouping,
  onTreeMapGroupingChange,
  selectedFunds,
  onToggleFund,
  onClearFunds,
  fundOptions,
  activeSummary,
  treeMapWidth,
  treeMapHeight,
  enableIntroAnimation = true,
  enableValueAnimations = true,
  fetchError,
  onRefresh,
  isRefreshing = false,
}: DashboardProps) {
  const { summary, lastUpdated } = portfolioData;
  const searchQueryFromFilters = filters.searchQuery ?? "";
  const [searchInput, setSearchInput] = useState(searchQueryFromFilters);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeAgo = useTimeAgo(lastUpdated);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(portfolioName);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSearchInput(searchQueryFromFilters);
  }, [searchQueryFromFilters]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    setEditNameValue(portfolioName);
  }, [portfolioName]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

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
    if (e.key === "Enter") {
      handleCommitNameEdit();
    } else if (e.key === "Escape") {
      setEditNameValue(portfolioName);
      setIsEditingName(false);
    }
  }
  const visibleHoldingCount =
    viewMode === "holdings"
      ? filteredRows.length
      : getFilteredRows(
          portfolioData.tableRows,
          filters,
          sortConfig,
          selectedFunds
        ).length;

  const displayValue = activeSummary?.value ?? summary.totalValue;
  const displayGainLoss = activeSummary?.gainLoss ?? summary.totalGainLoss;
  const displayGainLossPercent =
    activeSummary?.gainLossPercent ?? summary.totalGainLossPercent;
  const isFiltered = hasActivePortfolioFilters(filters, selectedFunds);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const headerRef = useRef<HTMLElement>(null);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const [dockSentinelRef, isSearchDocked, headerHeightPx] = useIsStickyDocked(headerRef);
  const [searchShellHeightPx, setSearchShellHeightPx] = useState(0);

  useEffect(() => {
    const searchShell = searchShellRef.current;
    if (!searchShell) return;

    const updateHeight = () => setSearchShellHeightPx(searchShell.getBoundingClientRect().height);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(searchShell);
    return () => observer.disconnect();
  }, []);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onFiltersChange({ ...filtersRef.current, searchQuery: value });
      }, 250);
    },
    [onFiltersChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    onFiltersChange({ ...filtersRef.current, searchQuery: "" });
  }, [onFiltersChange]);

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-clip",
        enableIntroAnimation && "animate-fade-in",
        isMobile ? "pb-8" : "pb-20"
      )}
    >
      {/* Sticky Header — consistent background, never changes when search bar docks */}
      <header
        ref={headerRef}
        className={cn(
          "sticky-header sticky top-0 z-40",
          isSearchDocked && "border-b-0"
        )}
        style={
          {
            "--header-search-absorb-height": `${searchShellHeightPx}px`,
          } as CSSProperties
        }
      >
        <div
          aria-hidden="true"
          data-testid="header-search-absorber"
          className={cn("sticky-header-search-absorber", isSearchDocked && "is-docked")}
        />
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
            <div className="mb-4 flex min-w-0 items-center justify-between gap-4">
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
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-sm font-medium text-text-muted">Your portfolio</span>
                    {activeSummary && (
                      <span className="truncate text-sm text-text-muted">
                        — {activeSummary.label}
                      </span>
                    )}
                    {isFiltered && (
                      <ResetFiltersButton
                        onClick={onResetFilters}
                        label="Reset filters"
                        className={cn(
                          "ml-1 h-7 shrink-0 px-2 shadow-sm",
                          enableIntroAnimation && "animate-scale-in",
                          "border border-red-200/70 bg-red-50 text-red-700 hover:bg-red-100",
                          "dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                        )}
                      />
                    )}
                  </div>
                  {isEditingName && portfolioId && onRenamePortfolio ? (
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
                      onClick={portfolioId && onRenamePortfolio ? handleStartEditName : undefined}
                      className={cn(
                        "-ml-1.5 flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-1.5 py-0.5 text-left",
                        portfolioId && onRenamePortfolio && "cursor-pointer hover:opacity-80"
                      )}
                      disabled={!portfolioId || !onRenamePortfolio}
                      aria-label={portfolioId && onRenamePortfolio ? "Rename portfolio" : undefined}
                      title={portfolioId && onRenamePortfolio ? "Click to rename" : undefined}
                    >
                      <h1 className="truncate text-sm font-semibold text-text-primary md:text-base">
                        {portfolioName}
                      </h1>
                      {portfolioId && onRenamePortfolio && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-text-muted opacity-70"
                          aria-hidden="true"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
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
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn("shrink-0", isRefreshing && "animate-spin")}
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 21h5v-5" />
                    </svg>
                    Refresh
                  </button>
                )}
                {fetchError && (
                  <FetchStatusBadge
                    error={fetchError}
                    hasData
                    className="max-w-full"
                  />
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
                "gap-x-6 gap-y-3",
                isMobile
                  ? "flex flex-col items-start"
                  : "flex flex-wrap items-end"
              )}
            >
              <div
                className="min-w-fit shrink-0"
                title={`Market value: ${formatDollar(displayValue)}`}
              >
                <AnimatedNumber
                  value={displayValue}
                  format={formatHeaderCurrency}
                  animate={enableValueAnimations}
                  className={cn(
                    "font-bold text-text-primary whitespace-nowrap",
                    isMobile ? "text-[clamp(2rem,10vw,2.6rem)]" : "text-3xl md:text-5xl"
                  )}
                />
                <p className="mt-1 text-xs text-text-muted">
                  Current market value
                </p>
              </div>
              <div
                className={cn("min-w-0", !isMobile && "self-end")}
                title={`Unrealized gain: ${formatDollar(displayGainLoss)} / Return on cost basis: ${displayGainLossPercent.toFixed(2)}%`}
              >
                <GainLoss
                  dollar={displayGainLoss}
                  percent={displayGainLossPercent}
                  size={isMobile ? "sm" : "md"}
                  className={cn(isMobile ? "text-lg" : "text-xl md:text-2xl")}
                  formatDollarValue={formatHeaderCurrency}
                />
                <p className="mt-1 text-xs text-text-muted">
                  Unrealized gain / return on cost basis
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TreeMap */}
      <section
        className={cn(
          isMobile ? "pt-2" : "pt-6",
          "mb-6 max-w-[1400px] mx-auto",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "160ms" } as CSSProperties}
      >
        <TreeMap
          key={filteredTreeMapNodes.length > 0 ? "treemap-populated" : "treemap-empty"}
          nodes={filteredTreeMapNodes}
          originalWidth={treeMapWidth}
          originalHeight={treeMapHeight}
          grouping={treeMapGrouping}
          selectedFunds={selectedFunds}
          onToggleFund={onToggleFund}
          onClearFunds={onClearFunds}
          isMobile={isMobile}
          enableIntroAnimation={enableIntroAnimation}
        />
      </section>

      {isMobile && (
        <section className="px-4 mb-6 max-w-[1400px] mx-auto">
          <FloatingToolbar
            summary={summary}
            filters={filters}
            onFiltersChange={onFiltersChange}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            treeMapGrouping={treeMapGrouping}
            onTreeMapGroupingChange={onTreeMapGroupingChange}
            fundOptions={fundOptions}
            selectedFunds={selectedFunds}
            onToggleFund={onToggleFund}
            onClearFunds={onClearFunds}
            onResetFilters={onResetFilters}
            isMobile
            enableIntroAnimation={enableIntroAnimation}
          />
        </section>
      )}

      {/* Table */}
      <section
        className={cn(
          "max-w-[1400px] mx-auto",
          enableIntroAnimation && "animate-soft-rise",
          isMobile ? "px-4" : "px-6"
        )}
        style={{ "--enter-delay": "220ms" } as CSSProperties}
      >
        <div ref={dockSentinelRef} className="h-px" aria-hidden />
        <div
          ref={searchShellRef}
          data-testid="portfolio-search-shell"
          className={cn(
            "sticky mb-4 py-3",
            "w-screen relative",
            isSearchDocked
              ? "bg-transparent z-50"
              : "bg-transparent z-40"
          )}
          style={{
            marginLeft: "calc(-50vw + 50%)",
            marginRight: "calc(-50vw + 50%)",
            top:
              headerHeightPx > 0
                ? headerHeightPx
                : isMobile
                  ? 92
                  : 112,
          }}
        >
          <div
            aria-hidden="true"
            data-testid="portfolio-search-shell-background"
            className={cn(
              "pointer-events-none absolute inset-0 transition-[background-color,box-shadow] duration-220",
              isSearchDocked
                ? "bg-surface shadow-[var(--shadow)]"
                : "bg-transparent shadow-none"
            )}
          />
          <div
            className={cn(
              "relative z-10 flex items-center gap-3",
              isMobile ? "px-4" : "px-6",
              "max-w-[1400px] mx-auto"
            )}
          >
            <div className={cn("relative min-w-0 flex-1", !isMobile && "max-w-xl lg:max-w-2xl")}>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 z-10 text-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                role="searchbox"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search by name or symbol"
                aria-label="Search portfolio"
                className={cn(
                  "w-full rounded-xl border border-border py-2.5 pl-10 text-sm text-text-primary shadow-[var(--shadow-sm)]",
                  isSearchDocked ? "bg-surface" : "bg-surface/95 backdrop-blur-xl",
                  "outline-none transition-colors placeholder:text-text-muted hover:border-border/80 focus:border-border",
                  searchInput.length > 0 ? "pr-10" : "pr-3"
                )}
              />
              {searchInput.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "inline-flex h-6 w-6 items-center justify-center rounded-full",
                    "text-text-muted hover:text-text-primary hover:bg-surface-hover",
                    "transition-colors cursor-pointer"
                  )}
                  aria-label="Clear search"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
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
        </div>

        <PortfolioTable
          rows={filteredRows}
          sortConfig={sortConfig}
          onSort={onSort}
          expandedRows={expandedRows}
          onToggleExpand={onToggleExpand}
          isMobile={isMobile}
          enableIntroAnimation={enableIntroAnimation}
          enableValueAnimations={enableValueAnimations}
        />
      </section>

      {!isMobile && (
        <FloatingToolbar
          summary={summary}
          filters={filters}
          onFiltersChange={onFiltersChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          treeMapGrouping={treeMapGrouping}
          onTreeMapGroupingChange={onTreeMapGroupingChange}
          fundOptions={fundOptions}
          selectedFunds={selectedFunds}
          onToggleFund={onToggleFund}
          onClearFunds={onClearFunds}
          onResetFilters={onResetFilters}
          enableIntroAnimation={enableIntroAnimation}
        />
      )}
    </div>
  );
}
