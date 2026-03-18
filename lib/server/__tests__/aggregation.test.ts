import { describe, expect, it } from "vitest";
import { computePortfolioData } from "../aggregation";
import type { FidelityPosition } from "@/lib/types";

function makePosition(
  overrides: Partial<FidelityPosition> = {}
): FidelityPosition {
  return {
    accountNumber: "1",
    accountName: "DG 401K",
    investmentType: "Others",
    symbol: "09261F572",
    description: "BTC LPATH IDX 2055 M",
    quantity: 20304.534,
    lastPrice: 16.5199,
    lastPriceChange: 0.1955,
    currentValue: 335428.89,
    todayGainLossDollar: 3969.54,
    todayGainLossPercent: 1.2,
    totalGainLossDollar: 94943.14,
    totalGainLossPercent: 39.48,
    percentOfAccount: 100,
    costBasisTotal: 240485.75,
    averageCostBasis: 11.84,
    type: "",
    ...overrides,
  };
}

describe("computePortfolioData", () => {
  it("does not double count positions without holdings data", () => {
    const positions = [makePosition()];

    const result = computePortfolioData(positions, {}, {}, 1200, 400);
    const btcPathRow = result.tableRows.find((row) => row.symbol === "09261F572");

    expect(result.summary.totalValue).toBeCloseTo(335428.89);
    expect(btcPathRow).toMatchObject({
      symbol: "09261F572",
      totalValue: 335428.89,
      isExpandable: false,
    });
    expect(btcPathRow?.sources).toHaveLength(1);
    expect(btcPathRow?.sources[0]).toMatchObject({
      type: "direct",
      value: 335428.89,
      percentOfSource: 100,
    });
  });

  it("decomposes funds only when holdings data exists", () => {
    const positions = [
      makePosition({
        investmentType: "ETFs",
        symbol: "VTI",
        description: "Vanguard Total Stock Market ETF",
        currentValue: 100,
        totalGainLossDollar: 10,
        costBasisTotal: 90,
      }),
    ];

    const result = computePortfolioData(
      positions,
      {},
      {
        VTI: [
          { symbol: "AAPL", holdingName: "Apple Inc.", holdingPercent: 0.6 },
          { symbol: "MSFT", holdingName: "Microsoft Corp.", holdingPercent: 0.4 },
        ],
      },
      1200,
      400
    );

    expect(result.tableRows.find((row) => row.symbol === "VTI")).toBeUndefined();
    expect(result.tableRows.find((row) => row.symbol === "AAPL")?.totalValue).toBe(
      60
    );
    expect(result.tableRows.find((row) => row.symbol === "MSFT")?.totalValue).toBe(
      40
    );
  });

  it("labels retained remainder as rest of the fund in treemap and table", () => {
    const positions = [
      makePosition({
        investmentType: "ETFs",
        symbol: "VTI",
        description: "Vanguard Total Stock Market ETF",
        currentValue: 100,
        totalGainLossDollar: 10,
        costBasisTotal: 90,
      }),
    ];

    const result = computePortfolioData(
      positions,
      {
        VTI: {
          symbol: "VTI",
          regularMarketPrice: 100,
          regularMarketChange: 1,
          regularMarketChangePercent: 1,
          fiftyTwoWeekHigh: 110,
          fiftyTwoWeekLow: 90,
          shortName: "VTI",
          longName: "Vanguard Total Stock Market ETF",
        },
      },
      {
        VTI: [
          {
            symbol: "AAPL",
            holdingName: "Apple Inc.",
            holdingPercent: 0.6,
          },
          {
            symbol: "VTI",
            holdingName: "Rest of Vanguard Total Stock Market ETF",
            holdingPercent: 0.4,
          },
        ],
      },
      1200,
      400
    );

    const retainedRow = result.tableRows.find((row) => row.symbol === "VTI");
    const retainedNode = result.treeMapNodes.find(
      (node) => node.depth === 2 && node.symbol === "VTI"
    );

    expect(retainedRow).toMatchObject({
      symbol: "VTI",
      name: "Rest of Vanguard Total Stock Market ETF",
      totalValue: 40,
    });
    expect(retainedNode).toMatchObject({
      symbol: "VTI",
      name: "Rest of Vanguard Total Stock Market ETF",
      value: 40,
    });
  });
});
