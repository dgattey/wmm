import { getFiftyTwoWeekPosition } from "./fiftyTwoWeek";
import type { PositionSource, SortConfig, TableRow } from "./types";

export const FIFTY_TWO_WEEK_POSITION_SORT_KEY = "fiftyTwoWeekPosition";
export const SORTABLE_TABLE_KEYS = [
  "totalValue",
  "percentOfPortfolio",
  "currentPrice",
  "totalGainLossDollar",
  "totalGainLossPercent",
  FIFTY_TWO_WEEK_POSITION_SORT_KEY,
] as const;
export const DEFAULT_SORT_CONFIG: SortConfig = {
  key: "totalValue",
  direction: "desc",
};

export function isSortableTableKey(key: string): key is (typeof SORTABLE_TABLE_KEYS)[number] {
  return SORTABLE_TABLE_KEYS.includes(key as (typeof SORTABLE_TABLE_KEYS)[number]);
}

function compareSortValues(
  aVal: number | string | null,
  bVal: number | string | null,
  direction: "asc" | "desc"
): number {
  if (typeof aVal === "number" && typeof bVal === "number") {
    return direction === "asc" ? aVal - bVal : bVal - aVal;
  }

  if (typeof aVal === "string" && typeof bVal === "string") {
    const cmp = aVal.localeCompare(bVal);
    return direction === "asc" ? cmp : -cmp;
  }

  if (aVal === null && bVal === null) return 0;
  if (aVal === null) return 1;
  if (bVal === null) return -1;

  return 0;
}

function getExpandedSourceSortValue(
  source: PositionSource,
  key: string,
  parentRow: TableRow
): number | string | null {
  if (key === FIFTY_TWO_WEEK_POSITION_SORT_KEY) {
    if (source.type !== "direct") return null;
    return getFiftyTwoWeekPosition(
      parentRow.fiftyTwoWeekLow,
      parentRow.fiftyTwoWeekHigh,
      parentRow.currentPrice
    );
  }

  if (key === "totalValue") return source.value;
  if (key === "percentOfPortfolio") return source.percentOfPortfolio;
  if (key === "totalGainLossDollar") {
    return source.totalGainLossDollar ?? null;
  }
  if (key === "totalGainLossPercent") {
    const basis = source.costBasisTotal ?? 0;
    const gl = source.totalGainLossDollar ?? 0;
    return basis > 0 ? (gl / basis) * 100 : null;
  }
  if (key === "currentPrice") {
    return source.type === "direct" ? parentRow.currentPrice : null;
  }

  return null;
}

function getSortValue(row: TableRow, key: string): number | string | null {
  if (key === FIFTY_TWO_WEEK_POSITION_SORT_KEY) {
    return getFiftyTwoWeekPosition(
      row.fiftyTwoWeekLow,
      row.fiftyTwoWeekHigh,
      row.currentPrice
    );
  }

  const value = row[key as keyof TableRow];
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return null;
}

export function sortTableRows(
  rows: TableRow[],
  sortConfig: SortConfig
): TableRow[] {
  return [...rows].sort((a, b) => {
    const aVal = getSortValue(a, sortConfig.key);
    const bVal = getSortValue(b, sortConfig.key);
    return compareSortValues(aVal, bVal, sortConfig.direction);
  });
}

/** Sorts breakdown sources under an expanded row to match the table sort column. */
export function sortSourcesForExpandedRow(
  sources: PositionSource[],
  sortConfig: SortConfig,
  parentRow: TableRow
): PositionSource[] {
  return [...sources].sort((a, b) => {
    const primary = compareSortValues(
      getExpandedSourceSortValue(a, sortConfig.key, parentRow),
      getExpandedSourceSortValue(b, sortConfig.key, parentRow),
      sortConfig.direction
    );
    if (primary !== 0) return primary;
    const byValue = b.value - a.value;
    if (byValue !== 0) return byValue;
    return a.account.localeCompare(b.account);
  });
}
