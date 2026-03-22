import { describe, expect, it } from "vitest";

import {
  FIFTY_TWO_WEEK_POSITION_SORT_KEY,
  sortSourcesForExpandedRow,
  sortTableRows,
} from "../tableSort";
import type { PositionSource, SortConfig, TableRow } from "../types";

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

function makeFundSource(
  fundSymbol: string,
  value: number,
  account: string
): PositionSource {
  return {
    type: "fund",
    sourceSymbol: fundSymbol,
    sourceName: `${fundSymbol} fund`,
    value,
    percentOfSource: 1,
    percentOfPortfolio: value / 10,
    account,
    investmentType: "ETFs",
  };
}

describe("sortSourcesForExpandedRow", () => {
  const parentRow = makeRow({ symbol: "MSFT", totalValue: 1000 });

  it("sorts fund sources by value descending when table sort is totalValue desc", () => {
    const sources: PositionSource[] = [
      makeFundSource("SPY", 100, "A"),
      makeFundSource("VTI", 500, "A"),
      makeFundSource("VOO", 200, "B"),
    ];
    const sortConfig: SortConfig = { key: "totalValue", direction: "desc" };
    expect(
      sortSourcesForExpandedRow(sources, sortConfig, parentRow).map((s) => s.sourceSymbol)
    ).toEqual(["VTI", "VOO", "SPY"]);
  });

  it("sorts fund sources by value ascending when table sort is totalValue asc", () => {
    const sources: PositionSource[] = [
      makeFundSource("SPY", 100, "A"),
      makeFundSource("VTI", 500, "A"),
    ];
    const sortConfig: SortConfig = { key: "totalValue", direction: "asc" };
    expect(
      sortSourcesForExpandedRow(sources, sortConfig, parentRow).map((s) => s.sourceSymbol)
    ).toEqual(["SPY", "VTI"]);
  });

  it("does not group by account ahead of the active sort key", () => {
    const sources: PositionSource[] = [
      makeFundSource("A", 50, "Zebra"),
      makeFundSource("B", 200, "Apple"),
      makeFundSource("C", 100, "Mango"),
    ];
    const sortConfig: SortConfig = { key: "totalValue", direction: "desc" };
    expect(
      sortSourcesForExpandedRow(sources, sortConfig, parentRow).map((s) => s.sourceSymbol)
    ).toEqual(["B", "C", "A"]);
  });
});
