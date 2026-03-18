import { describe, expect, it } from "vitest";
import { computePortfolioData } from "../aggregation";
import type { FidelityPosition, FundHolding, QuoteData } from "../../types";

function makePosition(
  overrides: Partial<FidelityPosition>
): FidelityPosition {
  return {
    accountNumber: "Z12345678",
    accountName: "Brokerage",
    investmentType: "Stocks",
    symbol: "AAPL",
    description: "Apple Inc.",
    quantity: 1,
    lastPrice: 100,
    lastPriceChange: 0,
    currentValue: 100,
    todayGainLossDollar: 0,
    todayGainLossPercent: 0,
    totalGainLossDollar: 0,
    totalGainLossPercent: 0,
    percentOfAccount: 0,
    costBasisTotal: 100,
    averageCostBasis: 100,
    type: "Cash",
    ...overrides,
  };
}

describe("computePortfolioData treemap layout", () => {
  it("does not reserve unused header space above top-level treemap nodes", () => {
    const positions: FidelityPosition[] = [
      makePosition({
        investmentType: "ETFs",
        symbol: "VTI",
        description: "Vanguard Total Stock Market ETF",
        currentValue: 600,
      }),
      makePosition({
        investmentType: "Stocks",
        symbol: "MSFT",
        description: "Microsoft Corp.",
        currentValue: 400,
      }),
    ];

    const holdings: Record<string, FundHolding[]> = {
      VTI: [
        { symbol: "AAPL", holdingName: "Apple Inc.", holdingPercent: 0.6 },
        { symbol: "NVDA", holdingName: "NVIDIA Corp.", holdingPercent: 0.4 },
      ],
    };

    const quotes: Record<string, QuoteData> = {};
    const { treeMapNodes } = computePortfolioData(
      positions,
      quotes,
      holdings,
      1200,
      400
    );

    const topLevelNodes = treeMapNodes.filter((node) => node.depth === 1);
    const highestTopLevelY = Math.min(...topLevelNodes.map((node) => node.y0));

    expect(highestTopLevelY).toBeLessThan(5);

    const fundNode = topLevelNodes.find((node) => node.symbol === "VTI");
    const fundChildren = treeMapNodes.filter(
      (node) => node.depth === 2 && node.parentSymbol === "VTI"
    );

    expect(fundNode).toBeDefined();
    expect(fundChildren.length).toBeGreaterThan(0);

    const highestFundChildY = Math.min(...fundChildren.map((node) => node.y0));
    expect(highestFundChildY).toBeGreaterThan((fundNode?.y0 ?? 0) + 10);
  });
});
