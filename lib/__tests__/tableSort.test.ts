import { describe, expect, it } from "vitest";

import {
  FIFTY_TWO_WEEK_POSITION_SORT_KEY,
  sortTableRows,
} from "../tableSort";
import type { SortConfig, TableRow } from "../types";

function makeRow(overrides: Partial<TableRow>): TableRow {
  return {
    symbol: "ROW",
    name: "Row",
    accounts: ["Taxable"],
    investmentTypes: ["Stocks"],
    totalValue: 100,
    percentOfPortfolio: 10,
    currentPrice: 100,
    totalGainLossDollar: 0,
    totalGainLossPercent: 0,
    fiftyTwoWeekHigh: 120,
    fiftyTwoWeekLow: 80,
    isExpandable: false,
    sources: [],
    ...overrides,
  };
}

describe("sortTableRows", () => {
  it("sorts 52-week range by relative range position descending", () => {
    const rows = [
      makeRow({
        symbol: "ABSOLUTE_HIGHER",
        currentPrice: 200,
        fiftyTwoWeekLow: 0,
        fiftyTwoWeekHigh: 500,
      }),
      makeRow({
        symbol: "RELATIVE_HIGHER",
        currentPrice: 99,
        fiftyTwoWeekLow: 50,
        fiftyTwoWeekHigh: 100,
      }),
    ];

    const sortConfig: SortConfig = {
      key: FIFTY_TWO_WEEK_POSITION_SORT_KEY,
      direction: "desc",
    };

    expect(sortTableRows(rows, sortConfig).map((row) => row.symbol)).toEqual([
      "RELATIVE_HIGHER",
      "ABSOLUTE_HIGHER",
    ]);
  });

  it("sorts 52-week range by relative range position ascending", () => {
    const rows = [
      makeRow({
        symbol: "NEAR_LOW",
        currentPrice: 55,
        fiftyTwoWeekLow: 50,
        fiftyTwoWeekHigh: 100,
      }),
      makeRow({
        symbol: "NEAR_HIGH",
        currentPrice: 95,
        fiftyTwoWeekLow: 50,
        fiftyTwoWeekHigh: 100,
      }),
    ];

    const sortConfig: SortConfig = {
      key: FIFTY_TWO_WEEK_POSITION_SORT_KEY,
      direction: "asc",
    };

    expect(sortTableRows(rows, sortConfig).map((row) => row.symbol)).toEqual([
      "NEAR_LOW",
      "NEAR_HIGH",
    ]);
  });

  it("keeps rows without a valid 52-week range at the bottom", () => {
    const rows = [
      makeRow({
        symbol: "NO_RANGE",
        currentPrice: 10,
        fiftyTwoWeekLow: 0,
        fiftyTwoWeekHigh: 0,
      }),
      makeRow({
        symbol: "VALID",
        currentPrice: 95,
        fiftyTwoWeekLow: 50,
        fiftyTwoWeekHigh: 100,
      }),
    ];

    const sortConfig: SortConfig = {
      key: FIFTY_TWO_WEEK_POSITION_SORT_KEY,
      direction: "desc",
    };

    expect(sortTableRows(rows, sortConfig).map((row) => row.symbol)).toEqual([
      "VALID",
      "NO_RANGE",
    ]);
  });
});
