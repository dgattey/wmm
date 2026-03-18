"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  FundOption,
  PortfolioSummary,
  FilterState,
  TreeMapGrouping,
  ViewMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  summary: PortfolioSummary;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  lastUpdated: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  treeMapGrouping: TreeMapGrouping;
  onTreeMapGroupingChange: (mode: TreeMapGrouping) => void;
  fundOptions: FundOption[];
  selectedFunds: string[];
  onToggleFund: (symbol: string) => void;
  onClearFunds: () => void;
  isMobile?: boolean;
  enableIntroAnimation?: boolean;
}

export function FloatingToolbar({
  summary,
  filters,
  onFiltersChange,
  lastUpdated,
  viewMode,
  onViewModeChange,
  treeMapGrouping,
  onTreeMapGroupingChange,
  fundOptions,
  selectedFunds,
  onToggleFund,
  onClearFunds,
  isMobile = false,
  enableIntroAnimation = true,
}: FloatingToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  function toggleInvestmentType(type: string) {
    const current = filters.investmentTypes;
    const updated = current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type];
    onFiltersChange({ ...filters, investmentTypes: updated });
  }

  function clearInvestmentTypes() {
    onFiltersChange({ ...filters, investmentTypes: [] });
  }

  function handleAccountChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      accounts: value === "" ? [] : [value],
    });
  }

  function clearAllFilters() {
    onFiltersChange({ investmentTypes: [], accounts: [] });
    onClearFunds();
  }

  const hasFilters =
    filters.investmentTypes.length > 0 ||
    filters.accounts.length > 0 ||
    selectedFunds.length > 0;
  const [now, setNow] = useState(() => Date.now());
  const activeFilterCount =
    filters.investmentTypes.length +
    filters.accounts.length +
    selectedFunds.length;
  const filterSummaryItems = getFilterSummaryItems(filters, selectedFunds);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(interval);
  }, []);

  const secondsAgo = Math.floor(
    (now - new Date(lastUpdated).getTime()) / 1000
  );
  const timeAgo =
    secondsAgo < 5
      ? "just now"
      : secondsAgo < 60
        ? `${secondsAgo}s ago`
        : `${Math.floor(secondsAgo / 60)}m ago`;

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
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-medium whitespace-nowrap text-red-400/80 transition-colors hover:text-red-300 hover-lift press-down cursor-pointer"
                >
                  Reset filters
                </button>
              ) : (
                <span className="h-4" aria-hidden="true" />
              )}

              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-white/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {timeAgo}
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
                aria-label={
                  activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"
                }
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
                aria-label={
                  activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"
                }
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
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="cursor-pointer whitespace-nowrap text-xs font-medium text-red-400/80 transition-colors hover:text-red-300 hover-lift press-down"
                >
                  Reset filters
                </button>
              )}

              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-white/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {timeAgo}
              </div>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="origin-bottom animate-soft-pop flex flex-col gap-3">
            <FilterCard
              label="Account"
              subtitle="Limit the view to a single account."
              style={{ "--enter-delay": "0ms" } as CSSProperties}
            >
              <select
                value={filters.accounts.length === 1 ? filters.accounts[0] : ""}
                onChange={handleAccountChange}
                className={cn(
                  "w-full min-w-[160px] rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/80",
                  "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_6px_center] bg-no-repeat pr-6",
                  "outline-none transition-colors hover:bg-white/10 hover-lift"
                )}
              >
                <option value="" className="bg-[#1a1d2e] text-white">
                  All accounts
                </option>
                {summary.accounts.map((acct) => (
                  <option
                    key={acct}
                    value={acct}
                    className="bg-[#1a1d2e] text-white"
                  >
                    {acct}
                  </option>
                ))}
              </select>
            </FilterCard>

            <FilterCard
              label="Types"
              subtitle="Choose one or more investment types."
              style={{ "--enter-delay": "60ms" } as CSSProperties}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearInvestmentTypes}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap hover-lift press-down animate-soft-pop",
                    filters.investmentTypes.length === 0
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                  )}
                  style={{ "--enter-delay": "80ms" } as CSSProperties}
                >
                  All types
                </button>
                {summary.investmentTypes.map((type, index) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleInvestmentType(type)}
                    className={cn(
                      "animate-soft-pop cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 hover-lift press-down",
                      filters.investmentTypes.includes(type)
                        ? "bg-accent text-white shadow-sm"
                        : "border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                    style={
                      {
                        "--enter-delay": `${120 + index * 30}ms`,
                      } as CSSProperties
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </FilterCard>

            <FilterCard
              label="Funds"
              subtitle="Apply the same top-line totals to selected funds."
              style={{ "--enter-delay": "120ms" } as CSSProperties}
              action={
                selectedFunds.length > 0 ? (
                  <button
                    type="button"
                    onClick={onClearFunds}
                    className="text-[11px] font-medium text-white/45 transition-colors hover:text-white/75 hover-lift press-down"
                  >
                    Clear
                  </button>
                ) : undefined
              }
            >
              {fundOptions.length > 0 ? (
                <div className="flex max-h-[220px] flex-wrap gap-2 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={onClearFunds}
                    className={cn(
                      "animate-soft-pop cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 hover-lift press-down",
                      selectedFunds.length === 0
                        ? "bg-white/15 text-white shadow-sm"
                        : "border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                    style={{ "--enter-delay": "140ms" } as CSSProperties}
                  >
                    All funds
                  </button>
                  {fundOptions.map((fund, index) => {
                    const isSelected = selectedFunds.includes(fund.symbol);

                    return (
                      <button
                        key={fund.symbol}
                        type="button"
                        onClick={() => onToggleFund(fund.symbol)}
                        className={cn(
                          "animate-soft-pop cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 hover-lift press-down",
                          isSelected
                            ? "border-transparent text-white shadow-sm"
                            : "border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                        )}
                        style={
                          {
                            "--enter-delay": `${180 + index * 30}ms`,
                            ...(isSelected
                              ? {
                                  backgroundColor: fund.color,
                                  borderColor: `${fund.color}66`,
                                }
                              : {}),
                          } as CSSProperties
                        }
                      >
                        {fund.symbol}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-white/40">
                  No funds match the current account and type filters.
                </p>
              )}
            </FilterCard>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <ToolbarLabel>{label}</ToolbarLabel>
      <div className="flex flex-wrap items-center rounded-lg bg-white/5 p-0.5">
        {children}
      </div>
    </div>
  );
}

function FilterCard({
  label,
  subtitle,
  action,
  style,
  children,
}: {
  label: string;
  subtitle: string;
  action?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3 animate-soft-pop"
      style={style}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <ToolbarLabel>{label}</ToolbarLabel>
          <p className="mt-1 text-xs text-white/40">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ToolbarLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40 whitespace-nowrap">
      {children}
    </span>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap hover-lift press-down",
        active
          ? "bg-white/15 text-white shadow-sm"
          : "text-white/50 hover:text-white/80"
      )}
    >
      {children}
    </button>
  );
}

function FilterToggleButton({
  active,
  activeFilterCount,
  fullWidth = false,
}: {
  active: boolean;
  activeFilterCount: number;
  fullWidth?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all",
        fullWidth && "w-full",
        active
          ? "bg-white/14 text-white border-white/0 shadow-sm ring-1 ring-white/10"
          : "bg-white/8 text-white/85 border-white/12 hover:bg-white/12"
      )}
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
        <path d="M3 5h18" />
        <path d="M6 12h12" />
        <path d="M10 19h4" />
      </svg>
      <span>Filters</span>
      {activeFilterCount > 0 && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
          {activeFilterCount}
        </span>
      )}
    </span>
  );
}

function FilterSummaryStrip({
  items,
  emptyLabel,
}: {
  items: Array<{ label: string; value: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="truncate text-xs text-white/38">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <FilterSummaryPill
          key={item.label}
          label={item.label}
          value={item.value}
        />
      ))}
    </div>
  );
}

function FilterSummaryPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/80">
      <span className="shrink-0 text-white/42">{label}</span>
      <span className="truncate font-medium text-white">{value}</span>
    </div>
  );
}

function getFilterSummaryItems(filters: FilterState, selectedFunds: string[]) {
  const items: Array<{ label: string; value: string }> = [];

  if (filters.accounts.length > 0) {
    items.push({
      label: "Account",
      value:
        filters.accounts.length === 1
          ? filters.accounts[0]
          : `${filters.accounts.length} selected`,
    });
  }

  if (filters.investmentTypes.length > 0) {
    items.push({
      label: filters.investmentTypes.length === 1 ? "Type" : "Types",
      value:
        filters.investmentTypes.length === 1
          ? filters.investmentTypes[0]
          : `${filters.investmentTypes.length} selected`,
    });
  }

  if (selectedFunds.length > 0) {
    items.push({
      label: selectedFunds.length === 1 ? "Fund" : "Funds",
      value:
        selectedFunds.length === 1
          ? selectedFunds[0]
          : `${selectedFunds.length} selected`,
    });
  }

  return items;
}
