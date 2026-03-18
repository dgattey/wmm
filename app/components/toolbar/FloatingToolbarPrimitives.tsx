"use client";

import type { CSSProperties, ReactNode } from "react";
import type { FilterState } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface FilterSummaryItem {
  label: string;
  value: string;
}

export function buildFilterSummaryItems(
  filters: FilterState,
  selectedFunds: string[]
): FilterSummaryItem[] {
  const items: FilterSummaryItem[] = [];

  if (filters.accounts.length > 0) {
    items.push({
      label: "Account",
      value:
        filters.accounts.length === 1
          ? filters.accounts[0]
          : `${filters.accounts.length} selected`,
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

  if (filters.investmentTypes.length > 0) {
    items.push({
      label: filters.investmentTypes.length === 1 ? "Type" : "Types",
      value:
        filters.investmentTypes.length === 1
          ? filters.investmentTypes[0]
          : `${filters.investmentTypes.length} selected`,
    });
  }

  return items;
}

export function ToolbarSection({
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

export function FilterCard({
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

export function SegmentButton({
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

export function FilterToggleButton({
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

export function FilterSummaryStrip({
  items,
  emptyLabel,
}: {
  items: FilterSummaryItem[];
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

function ToolbarLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40 whitespace-nowrap">
      {children}
    </span>
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
