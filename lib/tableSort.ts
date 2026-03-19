import { getFiftyTwoWeekPosition } from "./fiftyTwoWeek";
import type { SortConfig, TableRow } from "./types";

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

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      const cmp = aVal.localeCompare(bVal);
      return sortConfig.direction === "asc" ? cmp : -cmp;
    }

    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    return 0;
  });
}
