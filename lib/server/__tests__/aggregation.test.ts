import { describe, expect, it } from "vitest";
import { computePortfolioData } from "../aggregation";
import type { FidelityPosition, FundHolding, QuoteData } from "../../types";

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
      percentOfPortfolio: 100,
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
    expect(
      result.tableRows.find((row) => row.symbol === "AAPL")?.sources[0]
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
