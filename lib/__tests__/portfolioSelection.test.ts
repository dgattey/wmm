import { describe, expect, it } from "vitest";
import type { FidelityPosition, FilterState } from "@/lib/types";
import {
  sanitizeCurrentSelection,
  sanitizeSelectionForFilterChange,
  sanitizeSelectionForFundChange,
} from "@/lib/portfolioSelection";

function makePosition(
  overrides: Partial<FidelityPosition> = {}
): FidelityPosition {
  return {
    accountNumber: "TEST-0001",
    accountName: "Account A",
    investmentType: "Stocks",
    symbol: "EQTY-A",
    description: "Synthetic Equity A",
    quantity: 1,
    lastPrice: 100,
    lastPriceChange: 1,
    currentValue: 100,
    todayGainLossDollar: 0,
    todayGainLossPercent: 0,
    totalGainLossDollar: 10,
    totalGainLossPercent: 10,
    percentOfAccount: 100,
    costBasisTotal: 90,
    averageCostBasis: 90,
    type: "Equity",
    ...overrides,
  };
}

describe("portfolio selection sanitizing", () => {
  const positions = [
    makePosition({
      symbol: "FUND-A",
      description: "Synthetic Market Fund",
      investmentType: "ETFs",
    }),
    makePosition({
      symbol: "EQTY-A",
      description: "Synthetic Equity A",
      investmentType: "Stocks",
    }),
    makePosition({
      accountNumber: "TEST-0002",
      accountName: "Account B",
      symbol: "FUND-B",
      description: "Synthetic Income Fund",
      investmentType: "Mutual Funds",
    }),
  ];

  it("clears an incompatible fund when a new type filter is applied", () => {
    const previousFilters: FilterState = {
      accounts: [],
      investmentTypes: [],
    };

    const sanitized = sanitizeSelectionForFilterChange(
      positions,
      previousFilters,
      {
        accounts: [],
        investmentTypes: ["Stocks"],
      },
      ["FUND-A"]
    );

    expect(sanitized.selectedFunds).toEqual([]);
    expect(sanitized.filters.investmentTypes).toEqual(["Stocks"]);
  });

  it("clears incompatible type filters when a new account clears selected funds", () => {
    const previousFilters: FilterState = {
      accounts: [],
      investmentTypes: ["Stocks"],
    };

    const sanitized = sanitizeSelectionForFilterChange(
      positions,
      previousFilters,
      {
        accounts: ["Account B"],
        investmentTypes: ["Stocks"],
      },
      ["FUND-A"]
    );

    expect(sanitized.selectedFunds).toEqual([]);
    expect(sanitized.filters.accounts).toEqual(["Account B"]);
    expect(sanitized.filters.investmentTypes).toEqual([]);
  });

  it("narrows type filters to the selected fund's compatible investment types", () => {
    const sanitized = sanitizeSelectionForFundChange(
      positions,
      {
        accounts: [],
        investmentTypes: ["ETFs", "Mutual Funds"],
      },
      ["FUND-A"]
    );

    expect(sanitized.selectedFunds).toEqual(["FUND-A"]);
    expect(sanitized.filters.accounts).toEqual([]);
    expect(sanitized.filters.investmentTypes).toEqual(["ETFs"]);
  });

  it("keeps a selected fund when broadening the type filter", () => {
    const previousFilters: FilterState = {
      accounts: [],
      investmentTypes: ["ETFs"],
    };

    const sanitized = sanitizeSelectionForFilterChange(
      positions,
      previousFilters,
      {
        accounts: [],
        investmentTypes: ["ETFs", "Mutual Funds"],
      },
      ["FUND-A"]
    );

    expect(sanitized.selectedFunds).toEqual(["FUND-A"]);
    expect(sanitized.filters.investmentTypes).toEqual([
      "ETFs",
      "Mutual Funds",
    ]);
  });

  it("preserves searchQuery when sanitizing current selection", () => {
    const filters: FilterState = {
      accounts: [],
      investmentTypes: [],
      searchQuery: "fund",
    };

    const sanitized = sanitizeCurrentSelection(positions, filters, []);

    expect(sanitized.filters.searchQuery).toBe("fund");
  });
});
