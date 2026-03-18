import { describe, expect, it } from "vitest";
import { computePortfolioData } from "../aggregation";
import type { FidelityPosition, FundHolding, QuoteData } from "../../types";

function makePosition(
  overrides: Partial<FidelityPosition> = {}
): FidelityPosition {
  return {
    accountNumber: "TEST-0001",
    accountName: "Account A",
    investmentType: "Others",
    symbol: "PLANX",
    description: "Synthetic Allocation Fund",
    quantity: 1000,
    lastPrice: 12,
    lastPriceChange: 0.2,
    currentValue: 12000,
    todayGainLossDollar: 120,
    todayGainLossPercent: 1,
    totalGainLossDollar: 2400,
    totalGainLossPercent: 25,
    percentOfAccount: 100,
    costBasisTotal: 9600,
    averageCostBasis: 9.6,
    type: "",
    ...overrides,
  };
}

describe("computePortfolioData", () => {
  it("does not double count positions without holdings data", () => {
    const positions = [makePosition()];

    const result = computePortfolioData(positions, {}, {}, 1200, 400);
    const portfolioRow = result.tableRows.find((row) => row.symbol === "PLANX");

    expect(result.summary.totalValue).toBeCloseTo(12000);
    expect(portfolioRow).toMatchObject({
      symbol: "PLANX",
      totalValue: 12000,
      isExpandable: false,
    });
    expect(portfolioRow?.sources).toHaveLength(1);
    expect(portfolioRow?.sources[0]).toMatchObject({
      type: "direct",
      value: 12000,
      percentOfSource: 100,
      percentOfPortfolio: 100,
    });
  });

  it("decomposes funds only when holdings data exists", () => {
    const positions = [
      makePosition({
        investmentType: "ETFs",
        symbol: "FUNDX",
        description: "Synthetic Equity Fund",
        currentValue: 100,
        totalGainLossDollar: 10,
        costBasisTotal: 90,
      }),
    ];

    const result = computePortfolioData(
      positions,
      {},
      {
        FUNDX: [
          { symbol: "EQTYA", holdingName: "Synthetic Equity A", holdingPercent: 0.6 },
          { symbol: "EQTYB", holdingName: "Synthetic Equity B", holdingPercent: 0.4 },
        ],
      },
      1200,
      400
    );

    expect(result.tableRows.find((row) => row.symbol === "FUNDX")).toBeUndefined();
    expect(result.tableRows.find((row) => row.symbol === "EQTYA")?.totalValue).toBe(
      60
    );
    expect(result.tableRows.find((row) => row.symbol === "EQTYB")?.totalValue).toBe(
      40
    );
    expect(
      result.tableRows.find((row) => row.symbol === "EQTYA")?.sources[0]
    ).toMatchObject({
      type: "fund",
      value: 60,
      percentOfSource: 60,
      percentOfPortfolio: 60,
    });
  });

  it("does not reserve unused header space above top-level treemap nodes", () => {
    const positions: FidelityPosition[] = [
      makePosition({
        investmentType: "ETFs",
        symbol: "FUNDX",
        description: "Synthetic Equity Fund",
        currentValue: 600,
      }),
      makePosition({
        investmentType: "Stocks",
        symbol: "EQTYA",
        description: "Synthetic Equity A",
        currentValue: 400,
      }),
    ];

    const holdings: Record<string, FundHolding[]> = {
      FUNDX: [
        { symbol: "EQTYB", holdingName: "Synthetic Equity B", holdingPercent: 0.6 },
        { symbol: "EQTYC", holdingName: "Synthetic Equity C", holdingPercent: 0.4 },
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

    const fundNode = topLevelNodes.find((node) => node.symbol === "FUNDX");
    const fundChildren = treeMapNodes.filter(
      (node) => node.depth === 2 && node.parentSymbol === "FUNDX"
    );

    expect(fundNode).toBeDefined();
    expect(fundChildren.length).toBeGreaterThan(0);

    const highestFundChildY = Math.min(...fundChildren.map((node) => node.y0));
    expect(highestFundChildY).toBeGreaterThan((fundNode?.y0 ?? 0) + 10);
  });

  it("labels retained remainder as rest of the fund in treemap and table", () => {
    const positions = [
      makePosition({
        investmentType: "ETFs",
        symbol: "FUNDX",
        description: "Synthetic Equity Fund",
        currentValue: 100,
        totalGainLossDollar: 10,
        costBasisTotal: 90,
      }),
    ];

    const result = computePortfolioData(
      positions,
      {
        FUNDX: {
          symbol: "FUNDX",
          regularMarketPrice: 100,
          regularMarketChange: 1,
          regularMarketChangePercent: 1,
          fiftyTwoWeekHigh: 110,
          fiftyTwoWeekLow: 90,
          shortName: "FUNDX",
          longName: "Synthetic Equity Fund",
        },
      },
      {
        FUNDX: [
          {
            symbol: "EQTYA",
            holdingName: "Synthetic Equity A",
            holdingPercent: 0.6,
          },
          {
            symbol: "FUNDX",
            holdingName: "Rest of Synthetic Equity Fund",
            holdingPercent: 0.4,
          },
        ],
      },
      1200,
      400
    );

    const retainedRow = result.tableRows.find((row) => row.symbol === "FUNDX");
    const retainedNode = result.treeMapNodes.find(
      (node) => node.depth === 2 && node.symbol === "FUNDX"
    );

    expect(retainedRow).toMatchObject({
      symbol: "FUNDX",
      name: "Rest of Synthetic Equity Fund",
      totalValue: 40,
    });
    expect(retainedNode).toMatchObject({
      symbol: "FUNDX",
      name: "Rest of Synthetic Equity Fund",
      value: 40,
    });
  });
});
