"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import type {
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
}: FloatingToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  function toggleInvestmentType(type: string) {
    const current = filters.investmentTypes;
    const updated = current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type];
    onFiltersChange({ ...filters, investmentTypes: updated });
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
  }

  const hasFilters =
    filters.investmentTypes.length > 0 || filters.accounts.length > 0;
  const [now, setNow] = useState(() => Date.now());
  const activeFilterCount =
    filters.investmentTypes.length + (filters.accounts.length > 0 ? 1 : 0);

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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div
        className={cn(
          "flex flex-col gap-3 px-4 py-3 rounded-2xl",
          "bg-[#1a1d28]/92 backdrop-blur-2xl saturate-150",
          "border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.2)]",
          "ring-1 ring-inset ring-white/[0.04]",
          "w-fit max-w-[92vw]"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
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
              onClick={() => setShowFilters((open) => !open)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border cursor-pointer whitespace-nowrap",
                showFilters || hasFilters
                  ? "bg-white/12 text-white border-white/0 shadow-sm"
                  : "bg-white/5 text-white/65 border-white/10 hover:text-white hover:bg-white/10"
              )}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-400/80 hover:text-red-300 font-medium whitespace-nowrap cursor-pointer transition-colors"
              >
                Reset filters
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs text-white/40 whitespace-nowrap">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {timeAgo}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3 animate-fade-in">
            <label className="flex flex-wrap items-center gap-2">
              <ToolbarLabel>Account</ToolbarLabel>
              <select
                value={filters.accounts.length === 1 ? filters.accounts[0] : ""}
                onChange={handleAccountChange}
                className={cn(
                  "bg-white/5 border border-white/10 rounded-lg",
                  "text-xs text-white/80 px-2.5 py-1.5 min-w-[160px]",
                  "cursor-pointer outline-none",
                  "hover:bg-white/10 transition-colors",
                  "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_6px_center] bg-no-repeat pr-6"
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
            </label>

            {summary.investmentTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <ToolbarLabel>Types</ToolbarLabel>
                {summary.investmentTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleInvestmentType(type)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap",
                      "active:scale-95",
                      filters.investmentTypes.includes(type)
                        ? "bg-accent text-white shadow-sm"
                        : "text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
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
    <div className="flex items-center gap-2">
      <ToolbarLabel>{label}</ToolbarLabel>
      <div className="flex items-center rounded-lg bg-white/5 p-0.5">
        {children}
      </div>
    </div>
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
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap",
        active
          ? "bg-white/15 text-white shadow-sm"
          : "text-white/50 hover:text-white/80"
      )}
    >
      {children}
    </button>
  );
}
