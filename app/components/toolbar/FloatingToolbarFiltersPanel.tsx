"use client";

import type { ChangeEvent, CSSProperties } from "react";
import type { FilterState, FundOption, PortfolioSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FilterCard } from "./FloatingToolbarPrimitives";

interface FloatingToolbarFiltersPanelProps {
  summary: PortfolioSummary;
  filters: FilterState;
  fundOptions: FundOption[];
  selectedFunds: string[];
  onAccountChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onClearInvestmentTypes: () => void;
  onToggleInvestmentType: (type: string) => void;
  onClearFunds: () => void;
  onToggleFund: (symbol: string) => void;
}

export function FloatingToolbarFiltersPanel({
  summary,
  filters,
  fundOptions,
  selectedFunds,
  onAccountChange,
  onClearInvestmentTypes,
  onToggleInvestmentType,
  onClearFunds,
  onToggleFund,
}: FloatingToolbarFiltersPanelProps) {
  return (
    <div className="origin-bottom animate-soft-pop flex flex-col gap-3">
      <FilterCard
        label="Account"
        subtitle="Limit the view to a single account."
        style={{ "--enter-delay": "0ms" } as CSSProperties}
      >
        <select
          value={filters.accounts.length === 1 ? filters.accounts[0] : ""}
          onChange={onAccountChange}
          className={cn(
            "w-full min-w-[160px] rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/80",
            "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_6px_center] bg-no-repeat pr-6",
            "outline-none transition-colors hover:bg-white/10 hover-lift"
          )}
        >
          <option value="" className="bg-[#1a1d2e] text-white">
            All accounts
          </option>
          {summary.accounts.map((account) => (
            <option
              key={account}
              value={account}
              className="bg-[#1a1d2e] text-white"
            >
              {account}
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
            onClick={onClearInvestmentTypes}
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
              onClick={() => onToggleInvestmentType(type)}
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
  );
}
