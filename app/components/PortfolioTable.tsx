"use client";

import type { CSSProperties } from "react";
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
}: PortfolioTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted text-sm">
        No positions to display
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-x-auto rounded-2xl border border-border/60 bg-surface shadow-[var(--shadow-md)] animate-soft-rise"
      style={{ "--enter-delay": "80ms" } as CSSProperties}
    >
      <table className="w-full border-collapse min-w-[1040px]">
        <thead>
          <tr className="border-b border-border">
            {/* Sticky: Identity column */}
            <th
              className={cn(
                "sticky left-0 z-20 bg-surface",
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
          "group border-b border-border-subtle transition-all duration-150 animate-soft-rise",
          isEven ? "bg-transparent" : "bg-surface-hover/30",
          "hover:bg-surface-hover/60",
          row.isExpandable && "cursor-pointer"
        )}
        style={
          {
            "--enter-delay": `${index * 28}ms`,
          } as CSSProperties
        }
        onClick={row.isExpandable ? onToggle : undefined}
      >
        {/* Sticky: Identity */}
        <td
          className={cn(
            "sticky left-0 z-10 px-4 py-3",
            isEven ? "bg-bg" : "bg-surface",
            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4",
            "after:bg-gradient-to-r after:from-transparent",
            isEven ? "after:to-bg" : "after:to-surface",
            row.isExpandable && "transition-transform duration-200 group-hover:translate-x-0.5"
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
