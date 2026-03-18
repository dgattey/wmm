"use client";

import type { ReactNode } from "react";
import { FIFTY_TWO_WEEK_POSITION_SORT_KEY } from "@/lib/tableSort";
import type { TableRow, SortConfig } from "@/lib/types";
import { cn, formatDollar, formatPercent, formatPrice } from "@/lib/utils";
import { TickerIdentity } from "./primitives/TickerIdentity";
import { GainLoss } from "./primitives/GainLoss";
import { Badge } from "./primitives/Badge";
import { FiftyTwoWeekRange } from "./primitives/FiftyTwoWeekRange";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { SortHeader } from "./primitives/SortHeader";

interface PortfolioTableProps {
  rows: TableRow[];
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  expandedRows: Set<string>;
  onToggleExpand: (symbol: string) => void;
  isMobile?: boolean;
}

const SORTABLE_COLUMNS: {
  key: string;
  label: string;
  align?: "left" | "right";
  minWidthClass?: string;
}[] = [
  { key: "totalValue", label: "Value", align: "right" },
  { key: "percentOfPortfolio", label: "% Port", align: "right" },
  { key: "currentPrice", label: "Price", align: "right" },
  { key: "totalGainLossDollar", label: "$ Change", align: "right" },
  { key: "totalGainLossPercent", label: "% Change", align: "right" },
  {
    key: FIFTY_TWO_WEEK_POSITION_SORT_KEY,
    label: "52W Range",
    minWidthClass: "min-w-[12rem]",
  },
];

export function PortfolioTable({
  rows,
  sortConfig,
  onSort,
  expandedRows,
  onToggleExpand,
  isMobile = false,
}: PortfolioTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted text-sm">
        No positions to display
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-[var(--shadow-md)]">
          <div className="mb-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              Sort holdings
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Sort by</span>
              <select
                aria-label="Sort holdings"
                value={sortConfig.key}
                onChange={(event) => {
                  if (event.target.value !== sortConfig.key) {
                    onSort(event.target.value);
                  }
                }}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:border-border/80"
              >
                {SORTABLE_COLUMNS.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => onSort(sortConfig.key)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-bg px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
            >
              {sortConfig.direction === "desc" ? "Descending" : "Ascending"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <MobileRowCard
              key={row.symbol}
              row={row}
              isExpanded={expandedRows.has(row.symbol)}
              onToggle={() => onToggleExpand(row.symbol)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border/60 bg-surface shadow-[var(--shadow-md)]">
      <table className="w-full border-collapse min-w-[1040px]">
        <thead>
          <tr className="border-b border-border">
            {/* Sticky: Identity column */}
            <th
              className={cn(
                "sticky left-0 z-30 bg-surface",
                "text-left px-4 py-3",
                "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4",
                "after:bg-gradient-to-r after:from-transparent after:to-surface after:pointer-events-none"
              )}
              style={{ minWidth: 240 }}
            >
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Holding
              </span>
            </th>
            {/* Account */}
            <th className="text-left px-3 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Account
              </span>
            </th>
            {/* Type */}
            <th className="text-left px-3 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Type
              </span>
            </th>
            {/* Sortable columns */}
            {SORTABLE_COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-3",
                  col.minWidthClass,
                  col.align === "right" ? "text-right" : "text-left"
                )}
              >
                <SortHeader
                  label={col.label}
                  sortKey={col.key}
                  active={sortConfig.key === col.key}
                  direction={sortConfig.direction}
                  onClick={() => onSort(col.key)}
                  className={col.align === "right" ? "justify-end" : ""}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <TableRowGroup
              key={row.symbol}
              row={row}
              index={idx}
              isExpanded={expandedRows.has(row.symbol)}
              onToggle={() => onToggleExpand(row.symbol)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileRowCard({
  row,
  isExpanded,
  onToggle,
}: {
  row: TableRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-surface p-4 shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <TickerIdentity symbol={row.symbol} name={row.name} size="md" />
        {row.isExpandable && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            {isExpanded ? "Hide breakdown" : "Show breakdown"}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {row.investmentTypes.map((type) => (
          <Badge key={type} label={type} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <MetricCell label="Accounts" className="col-span-2">
          <span className="text-sm text-text-primary break-words">
            {row.accounts.join(", ")}
          </span>
        </MetricCell>
        <MetricCell label="Value">
          <AnimatedNumber
            value={row.totalValue}
            format={formatDollar}
            className="text-sm font-semibold text-text-primary"
          />
        </MetricCell>
        <MetricCell label="% Port">
          <span className="text-sm text-text-primary tabular-nums">
            {formatPercent(row.percentOfPortfolio)}
          </span>
        </MetricCell>
        <MetricCell label="Price">
          <AnimatedNumber
            value={row.currentPrice}
            format={formatPrice}
            className="text-sm text-text-primary"
          />
        </MetricCell>
        <MetricCell label="Change">
          <GainLoss
            dollar={row.totalGainLossDollar}
            percent={row.totalGainLossPercent}
            size="sm"
          />
        </MetricCell>
        <MetricCell label="52W Range" className="col-span-2">
          <FiftyTwoWeekRange
            low={row.fiftyTwoWeekLow}
            high={row.fiftyTwoWeekHigh}
            current={row.currentPrice}
            size="sm"
          />
        </MetricCell>
      </div>

      {isExpanded && row.sources.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            Source breakdown
          </span>
          {row.sources.map((source, index) => (
            <div
              key={`${row.symbol}-${source.sourceSymbol}-${index}`}
              className="rounded-xl border border-border/50 bg-bg px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary break-words">
                    {source.type === "direct" ? source.account : source.sourceName}
                  </div>
                  <div className="text-xs text-text-muted break-words">
                    {source.type === "direct"
                      ? "Direct holding"
                      : `${source.sourceName} (${source.sourceSymbol})`}
                  </div>
                </div>
                <Badge label={source.investmentType} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <MetricCell label="Account">
                  <span className="text-xs text-text-primary break-words">
                    {source.account}
                  </span>
                </MetricCell>
                <MetricCell label="Value">
                  <span className="text-xs font-medium text-text-primary tabular-nums">
                    {formatDollar(source.value)}
                  </span>
                </MetricCell>
                <MetricCell label="% Source">
                  <span className="text-xs text-text-primary tabular-nums">
                    {formatPercent(source.percentOfSource)}
                  </span>
                </MetricCell>
                <MetricCell label="% Port">
                  <span className="text-xs text-text-primary tabular-nums">
                    {formatPercent(source.percentOfPortfolio)}
                  </span>
                </MetricCell>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function MetricCell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// === Row Component ===

function TableRowGroup({
  row,
  index,
  isExpanded,
  onToggle,
}: {
  row: TableRow;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isEven = index % 2 === 0;

  return (
    <>
      {/* Main row */}
      <tr
        className={cn(
          "border-b border-border-subtle transition-colors duration-150",
          isEven ? "bg-transparent" : "bg-surface-hover/30",
          "hover:bg-surface-hover/60",
          row.isExpandable && "cursor-pointer"
        )}
        onClick={row.isExpandable ? onToggle : undefined}
      >
        {/* Sticky: Identity */}
        <td
          className={cn(
            "sticky left-0 z-10 px-4 py-3",
            isEven ? "bg-bg" : "bg-surface",
            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4",
            "after:bg-gradient-to-r after:from-transparent",
            isEven ? "after:to-bg" : "after:to-surface"
          )}
        >
          <div className="flex items-center gap-2">
            {row.isExpandable && (
              <span
                className={cn(
                  "text-text-muted text-xs transition-transform duration-200",
                  isExpanded && "rotate-90"
                )}
              >
                ▶
              </span>
            )}
            {!row.isExpandable && <span className="w-3" />}
            <TickerIdentity symbol={row.symbol} name={row.name} size="md" />
          </div>
        </td>
        {/* Account */}
        <td className="px-3 py-3 text-sm text-text-muted whitespace-nowrap">
          {row.accounts.join(", ")}
        </td>
        {/* Type */}
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {row.investmentTypes.map((t) => (
              <Badge key={t} label={t} />
            ))}
          </div>
        </td>
        {/* Value */}
        <td className="px-3 py-3 text-right">
          <AnimatedNumber
            value={row.totalValue}
            format={formatDollar}
            className="text-sm font-medium text-text-primary"
          />
        </td>
        {/* % Portfolio */}
        <td className="px-3 py-3 text-right text-sm text-text-muted tabular-nums">
          {formatPercent(row.percentOfPortfolio)}
        </td>
        {/* Price */}
        <td className="px-3 py-3 text-right">
          <AnimatedNumber
            value={row.currentPrice}
            format={formatPrice}
            className="text-sm text-text-primary"
          />
        </td>
        {/* $ Change */}
        <td className="px-3 py-3 text-right">
          <GainLoss dollar={row.totalGainLossDollar} size="sm" />
        </td>
        {/* % Change */}
        <td className="px-3 py-3 text-right">
          <GainLoss percent={row.totalGainLossPercent} size="sm" />
        </td>
        {/* 52-Week Range */}
        <td className="min-w-[12rem] px-3 py-3">
          <FiftyTwoWeekRange
            low={row.fiftyTwoWeekLow}
            high={row.fiftyTwoWeekHigh}
            current={row.currentPrice}
            size="md"
          />
        </td>
      </tr>

      {/* Expanded source rows */}
      {isExpanded &&
        row.sources.map((source, sIdx) => (
          <tr
            key={`${row.symbol}-${source.sourceSymbol}-${sIdx}`}
            className={cn(
              "border-b border-border-subtle",
              "bg-surface-hover/20",
              "animate-slide-down"
            )}
            style={{ animationDelay: `${sIdx * 30}ms` }}
          >
            <td
              className={cn(
                "sticky left-0 z-10 pl-14 pr-4 py-2",
                "bg-surface-hover/20",
                "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4",
                "after:bg-gradient-to-r after:from-transparent after:to-surface-hover/20"
              )}
            >
              <TickerIdentity
                symbol={
                  source.type === "direct" ? row.symbol : source.sourceSymbol
                }
                name={source.sourceName}
                size="sm"
              />
            </td>
            <td className="px-3 py-2 text-xs text-text-muted">
              {source.account}
            </td>
            <td className="px-3 py-2">
              <Badge label={source.investmentType} />
            </td>
            <td className="px-3 py-2 text-right text-xs font-medium text-text-primary tabular-nums">
              {formatDollar(source.value)}
            </td>
            <td className="px-3 py-2 text-right text-xs text-text-muted tabular-nums">
              {formatPercent(source.percentOfPortfolio)}
            </td>
            <td colSpan={4} />
          </tr>
        ))}
    </>
  );
}
