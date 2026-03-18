"use client";

import { useState, type ChangeEvent } from "react";
import type {
  FilterState,
  FundOption,
  PortfolioSummary,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import { hasActivePortfolioFilters } from "@/lib/portfolioFilters";
import { cn } from "@/lib/utils";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { ResetFiltersButton } from "./primitives/ResetFiltersButton";
import { FloatingToolbarFiltersPanel } from "./toolbar/FloatingToolbarFiltersPanel";
import {
  FilterSummaryStrip,
  FilterToggleButton,
  SegmentButton,
  ToolbarSection,
  buildFilterSummaryItems,
} from "./toolbar/FloatingToolbarPrimitives";

interface FloatingToolbarProps {
  summary: PortfolioSummary;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  treeMapGrouping: TreeMapGrouping;
  onTreeMapGroupingChange: (mode: TreeMapGrouping) => void;
  fundOptions: FundOption[];
  selectedFunds: string[];
  onToggleFund: (symbol: string) => void;
  onClearFunds: () => void;
  onResetFilters: () => void;
  isMobile?: boolean;
  enableIntroAnimation?: boolean;
}

export function FloatingToolbar({
  summary,
  filters,
  onFiltersChange,
  lastUpdated,
  onRefresh,
  isRefreshing,
  viewMode,
  onViewModeChange,
  treeMapGrouping,
  onTreeMapGroupingChange,
  fundOptions,
  selectedFunds,
  onToggleFund,
  onClearFunds,
  onResetFilters,
  isMobile = false,
  enableIntroAnimation = true,
}: FloatingToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = hasActivePortfolioFilters(filters, selectedFunds);
  const activeFilterCount =
    filters.investmentTypes.length +
    filters.accounts.length +
    selectedFunds.length;
  const filterSummaryItems = buildFilterSummaryItems(filters, selectedFunds);
  const timeAgo = useTimeAgo(lastUpdated);

  function handleAccountChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      accounts: value === "" ? [] : [value],
    });
  }

  function clearInvestmentTypes() {
    onFiltersChange({ ...filters, investmentTypes: [] });
  }

  function toggleInvestmentType(type: string) {
    const nextTypes = filters.investmentTypes.includes(type)
      ? filters.investmentTypes.filter((item) => item !== type)
      : [...filters.investmentTypes, type];

    onFiltersChange({
      ...filters,
      investmentTypes: nextTypes,
    });
  }

  const filterButtonAriaLabel =
    activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters";

  return (
    <div
      className={cn(
        enableIntroAnimation && "animate-soft-rise",
        isMobile
          ? "w-full"
          : "fixed bottom-4 left-1/2 z-40 -translate-x-1/2"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#1a1d28]/92 px-4 py-3",
          "backdrop-blur-2xl saturate-150 ring-1 ring-inset ring-white/[0.04]",
          "shadow-[0_8px_40px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.2)]",
          isMobile
            ? "w-full max-w-none"
            : "w-[92vw] max-w-[44rem] lg:w-[72vw] lg:max-w-[1080px] hover-lift"
        )}
      >
        {isMobile ? (
          <>
            <div className="flex items-center justify-between gap-3">
              {hasFilters ? (
                <ResetFiltersButton
                  onClick={onResetFilters}
                  className="h-7 w-7 shrink-0 text-red-400/80 hover:text-red-300"
                />
              ) : (
                <span className="h-4" aria-hidden="true" />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh data"
                  title="Refresh quotes and holdings"
                  className="shrink-0 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={isRefreshing ? "animate-spin" : ""}
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                </button>
                <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-white/40">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {timeAgo}
                </div>
              </div>
            </div>

            <FilterSummaryStrip
              items={filterSummaryItems}
              emptyLabel="All accounts, all funds, all types"
            />

            <div className="grid gap-3">
              <ToolbarSection label="View">
                <SegmentButton
                  active={viewMode === "holdings"}
                  onClick={() => onViewModeChange("holdings")}
                >
                  Holdings
                </SegmentButton>
                <SegmentButton
                  active={viewMode === "positions"}
                  onClick={() => onViewModeChange("positions")}
                >
                  Positions
                </SegmentButton>
              </ToolbarSection>

              <ToolbarSection label="Treemap">
                <SegmentButton
                  active={treeMapGrouping === "fund"}
                  onClick={() => onTreeMapGroupingChange("fund")}
                >
                  By fund
                </SegmentButton>
                <SegmentButton
                  active={treeMapGrouping === "holding"}
                  onClick={() => onTreeMapGroupingChange("holding")}
                >
                  Flat
                </SegmentButton>
              </ToolbarSection>

              <button
                type="button"
                onClick={() => setShowFilters((open) => !open)}
                aria-label={filterButtonAriaLabel}
                className="flex w-full"
              >
                <FilterToggleButton
                  active={showFilters || hasFilters}
                  activeFilterCount={activeFilterCount}
                  fullWidth
                />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <ToolbarSection label="View">
                <SegmentButton
                  active={viewMode === "holdings"}
                  onClick={() => onViewModeChange("holdings")}
                >
                  Holdings
                </SegmentButton>
                <SegmentButton
                  active={viewMode === "positions"}
                  onClick={() => onViewModeChange("positions")}
                >
                  Positions
                </SegmentButton>
              </ToolbarSection>

              <ToolbarSection label="Treemap">
                <SegmentButton
                  active={treeMapGrouping === "fund"}
                  onClick={() => onTreeMapGroupingChange("fund")}
                >
                  By fund
                </SegmentButton>
                <SegmentButton
                  active={treeMapGrouping === "holding"}
                  onClick={() => onTreeMapGroupingChange("holding")}
                >
                  Flat
                </SegmentButton>
              </ToolbarSection>

              <button
                type="button"
                onClick={() => setShowFilters((open) => !open)}
                aria-label={filterButtonAriaLabel}
              >
                <FilterToggleButton
                  active={showFilters || hasFilters}
                  activeFilterCount={activeFilterCount}
                />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <FilterSummaryStrip
                items={filterSummaryItems}
                emptyLabel="All accounts, all funds, all types"
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              {hasFilters && (
                <ResetFiltersButton
                  onClick={onResetFilters}
                  className="h-7 w-7 shrink-0 text-red-400/80 hover:text-red-300"
                />
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh data"
                title="Refresh quotes and holdings"
                className="h-7 w-7 shrink-0 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className={isRefreshing ? "animate-spin" : ""}
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              </button>
              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-white/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {timeAgo}
              </div>
            </div>
          </div>
        )}

        {showFilters && (
          <FloatingToolbarFiltersPanel
            summary={summary}
            filters={filters}
            fundOptions={fundOptions}
            selectedFunds={selectedFunds}
            onAccountChange={handleAccountChange}
            onClearInvestmentTypes={clearInvestmentTypes}
            onToggleInvestmentType={toggleInvestmentType}
            onClearFunds={onClearFunds}
            onToggleFund={onToggleFund}
          />
        )}
      </div>
    </div>
  );
}
