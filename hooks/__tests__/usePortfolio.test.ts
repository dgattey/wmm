import { describe, expect, it } from "vitest";
import type { FidelityPosition, FilterState } from "@/lib/types";
import {
  sanitizeSelectionForFilterChange,
  sanitizeSelectionForFundChange,
} from "../usePortfolio";

function makePosition(
  overrides: Partial<FidelityPosition> = {}
): FidelityPosition {
  return {
    accountNumber: "1",
    accountName: "Brokerage",
    investmentType: "Stocks",
    symbol: "MSFT",
    description: "Microsoft",
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
      symbol: "VTI",
      description: "Vanguard Total Stock Market ETF",
      investmentType: "ETFs",
    }),
    makePosition({
      symbol: "MSFT",
      description: "Microsoft",
      investmentType: "Stocks",
    }),
    makePosition({
      accountNumber: "2",
      accountName: "Roth IRA",
      symbol: "FXAIX",
      description: "Fidelity 500 Index Fund",
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
      ["VTI"]
    );

    expect(sanitized.selectedFunds).toEqual([]);
    expect(sanitized.filters.investmentTypes).toEqual(["Stocks"]);
  });

  it("clears incompatible types when a new account is applied", () => {
    const previousFilters: FilterState = {
      accounts: [],
      investmentTypes: ["Stocks"],
    };

    const sanitized = sanitizeSelectionForFilterChange(
      positions,
      previousFilters,
      {
        accounts: ["Roth IRA"],
        investmentTypes: ["Stocks"],
      },
      ["VTI"]
    );

    expect(sanitized.selectedFunds).toEqual([]);
    expect(sanitized.filters.accounts).toEqual(["Roth IRA"]);
    expect(sanitized.filters.investmentTypes).toEqual([]);
  });

  it("keeps a newly selected fund and clears conflicting type filters", () => {
    const sanitized = sanitizeSelectionForFundChange(
      positions,
      {
        accounts: ["Brokerage"],
        investmentTypes: ["Stocks"],
      },
      ["VTI"]
    );

    expect(sanitized.selectedFunds).toEqual(["VTI"]);
    expect(sanitized.filters.accounts).toEqual(["Brokerage"]);
    expect(sanitized.filters.investmentTypes).toEqual([]);
  });
});
