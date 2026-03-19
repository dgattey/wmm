"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import type {
  FilterState,
  FundOption,
  PortfolioSummary,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import { hasSearchQuery } from "@/lib/portfolioFilters";
import { cn } from "@/lib/utils";
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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hasFilters =
    filters.investmentTypes.length > 0 ||
    filters.accounts.length > 0 ||
    hasSearchQuery(filters) ||
    selectedFunds.length > 0;
  const activeFilterCount =
    filters.investmentTypes.length +
    filters.accounts.length +
    (hasSearchQuery(filters) ? 1 : 0) +
    selectedFunds.length;
  const filterSummaryItems = buildFilterSummaryItems(filters, selectedFunds);

  useEffect(() => {
    if (!showFilters) return;
    function handlePointerDown(e: PointerEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        setShowFilters(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [showFilters]);

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
  const resetButtonClassName = cn(
    "ml-1 h-7 shrink-0 px-2 shadow-sm",
    "border border-red-200/70 bg-red-50 text-red-700 hover:bg-red-100",
    "dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
  );

  return (
    <div
      className={cn(
        enableIntroAnimation && "animate-soft-rise",
        isMobile
          ? "w-full"
          : "sticky bottom-4 z-40 mt-6 flex w-full justify-center px-4 md:px-6"
      )}
    >
      <div
        ref={toolbarRef}
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
            {hasFilters && (
              <div className="flex items-center justify-between gap-3">
                <ResetFiltersButton
                  onClick={onResetFilters}
                  label="Reset filters"
                  className={resetButtonClassName}
                />
              </div>
            )}

            <FilterSummaryStrip
              items={filterSummaryItems}
              emptyLabel="All accounts, all funds, all types"
            />

            <div className="grid gap-3">
              <ToolbarSection label="Graph">
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
                  Aggregated
                </SegmentButton>
              </ToolbarSection>

              <ToolbarSection label="Table">
                <SegmentButton
                  active={viewMode === "positions"}
                  onClick={() => onViewModeChange("positions")}
                >
                  By fund
                </SegmentButton>
                <SegmentButton
                  active={viewMode === "holdings"}
                  onClick={() => onViewModeChange("holdings")}
                >
                  Aggregated
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <ToolbarSection label="Graph">
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
                  Aggregated
                </SegmentButton>
              </ToolbarSection>

              <ToolbarSection label="Table">
                <SegmentButton
                  active={viewMode === "positions"}
                  onClick={() => onViewModeChange("positions")}
                >
                  By fund
                </SegmentButton>
                <SegmentButton
                  active={viewMode === "holdings"}
                  onClick={() => onViewModeChange("holdings")}
                >
                  Aggregated
                </SegmentButton>
              </ToolbarSection>
            </div>

            <div className="flex shrink-0 items-center gap-3">
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

              <div className="min-w-0 max-w-xs">
                <FilterSummaryStrip
                  items={filterSummaryItems}
                  emptyLabel="All accounts, all funds, all types"
                />
              </div>

              {hasFilters && (
                <ResetFiltersButton
                  onClick={onResetFilters}
                  label="Reset filters"
                  className={resetButtonClassName}
                />
              )}
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
