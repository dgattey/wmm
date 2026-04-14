import { describe, expect, it } from "vitest";
import {
  collectSearchMatchedPositionSymbols,
  getActivePortfolioSummary,
  getFilteredRows,
  getFilteredTreeMapNodes,
} from "@/lib/portfolioSelectors";
import type {
  FidelityPosition,
  PortfolioData,
  TableRow,
  TreeMapNode,
} from "@/lib/types";

const SORT_CONFIG = { key: "totalValue", direction: "desc" } as const;

function makeRow(overrides: Partial<TableRow>): TableRow {
  return {
    symbol: "FUND-A",
    name: "Synthetic Market Fund",
    accounts: ["Account A", "Account B"],
    investmentTypes: ["ETFs"],
    totalValue: 0,
    percentOfPortfolio: 0,
    currentPrice: 75,
    totalGainLossDollar: 0,
    totalGainLossPercent: 0,
    fiftyTwoWeekHigh: 82,
    fiftyTwoWeekLow: 68,
    isExpandable: false,
    sources: [],
    ...overrides,
  };
}

function makeTreeMapNode(overrides: Partial<TreeMapNode>): TreeMapNode {
  return {
    id: "node-1",
    symbol: "FUND-A",
    name: "Synthetic Market Fund",
    value: 100,
    color: "#4E9999",
    percentOfPortfolio: 10,
    x0: 0,
    y0: 0,
    x1: 100,
    y1: 100,
    depth: 1,
    investmentType: "ETFs",
    account: "Account A",
    ...overrides,
  };
}

function makePosition(
  overrides: Partial<FidelityPosition> = {}
): FidelityPosition {
  return {
    accountNumber: "TEST-0001",
    accountName: "Account A",
    investmentType: "ETFs",
    symbol: "FUND-A",
    description: "Synthetic Market Fund",
    quantity: 1,
    lastPrice: 100,
    lastPriceChange: 0,
    currentValue: 100,
    todayGainLossDollar: 0,
    todayGainLossPercent: 0,
    totalGainLossDollar: 10,
    totalGainLossPercent: 11.11,
    percentOfAccount: 100,
    costBasisTotal: 90,
    averageCostBasis: 90,
    type: "Mutual Fund",
    ...overrides,
  };
}

describe("portfolio selectors", () => {
  it("recalculates row totals from matching account sources", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "FUND-A",
        totalValue: 4300,
        totalGainLossDollar: 430,
        totalGainLossPercent: 10,
        isExpandable: true,
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Account A",
            value: 3300,
            percentOfSource: 100,
            percentOfPortfolio: 73.33,
            account: "Account A",
            investmentType: "ETFs",
            totalGainLossDollar: 330,
            costBasisTotal: 2970,
          },
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Account B",
            value: 1000,
            percentOfSource: 100,
            percentOfPortfolio: 22,
            account: "Account B",
            investmentType: "ETFs",
            totalGainLossDollar: 100,
            costBasisTotal: 900,
          },
        ],
      }),
      makeRow({
        symbol: "FUND-B",
        name: "Synthetic Growth Fund",
        accounts: ["Account B"],
        totalValue: 220,
        totalGainLossDollar: 20,
        totalGainLossPercent: 10,
        isExpandable: false,
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Account B",
            value: 220,
            percentOfSource: 100,
            percentOfPortfolio: 4.78,
            account: "Account B",
            investmentType: "ETFs",
            totalGainLossDollar: 20,
            costBasisTotal: 200,
          },
        ],
      }),
    ];

    const filtered = getFilteredRows(
      rows,
      { accounts: ["Account B"], investmentTypes: [] },
      SORT_CONFIG,
      []
    );

    expect(filtered).toHaveLength(2);
    expect(filtered[0]).toMatchObject({
      symbol: "FUND-A",
      accounts: ["Account B"],
      totalValue: 1000,
      totalGainLossDollar: 100,
      isExpandable: false,
    });
    expect(filtered[0].totalGainLossPercent).toBeCloseTo(11.11, 2);
    expect(filtered[0].percentOfPortfolio).toBeCloseTo(81.97, 2);
    expect(filtered[0].sources).toEqual([
      expect.objectContaining({
        account: "Account B",
        value: 1000,
      }),
    ]);
    expect(filtered[1]).toMatchObject({
      symbol: "FUND-B",
      accounts: ["Account B"],
      totalValue: 220,
      totalGainLossDollar: 20,
    });
  });

  it("maps aggregated holdings search to position rows via fund tickers (unified search)", () => {
    const metaHoldings = makeRow({
      symbol: "META",
      name: "Meta Platforms, Inc.",
      totalValue: 5000,
      totalGainLossDollar: 0,
      isExpandable: true,
      sources: [
        {
          type: "fund",
          sourceSymbol: "VTI",
          sourceName: "Vanguard Total Stock Market ETF",
          value: 3000,
          percentOfSource: 2,
          percentOfPortfolio: 3,
          account: "Account A",
          investmentType: "ETFs",
          totalGainLossDollar: 0,
          costBasisTotal: 0,
        },
        {
          type: "fund",
          sourceSymbol: "SPY",
          sourceName: "SPDR S&P 500 ETF Trust",
          value: 2000,
          percentOfSource: 1,
          percentOfPortfolio: 2,
          account: "Account A",
          investmentType: "ETFs",
          totalGainLossDollar: 0,
          costBasisTotal: 0,
        },
      ],
    });

    const vtiPosition = makeRow({
      symbol: "VTI",
      name: "Vanguard Total Stock Market ETF",
      totalValue: 50000,
      isExpandable: false,
      sources: [
        {
          type: "direct",
          sourceSymbol: "DIRECT",
          sourceName: "Account A",
          value: 50000,
          percentOfSource: 100,
          percentOfPortfolio: 50,
          account: "Account A",
          investmentType: "ETFs",
          totalGainLossDollar: 100,
          costBasisTotal: 45000,
        },
      ],
    });

    const unrelatedFund = makeRow({
      symbol: "BND",
      name: "Vanguard Total Bond Market ETF",
      totalValue: 10000,
      isExpandable: false,
      sources: [
        {
          type: "direct",
          sourceSymbol: "DIRECT",
          sourceName: "Account A",
          value: 10000,
          percentOfSource: 100,
          percentOfPortfolio: 10,
          account: "Account A",
          investmentType: "ETFs",
          totalGainLossDollar: 0,
          costBasisTotal: 9500,
        },
      ],
    });

    const filters = {
      accounts: [] as string[],
      investmentTypes: [] as string[],
      searchQuery: "meta",
    };

    const allowlist = collectSearchMatchedPositionSymbols(
      [metaHoldings],
      filters,
      []
    );
    expect(allowlist.has("META")).toBe(true);
    expect(allowlist.has("VTI")).toBe(true);
    expect(allowlist.has("SPY")).toBe(true);

    const positionFiltered = getFilteredRows(
      [vtiPosition, unrelatedFund],
      filters,
      SORT_CONFIG,
      [],
      allowlist
    );

    expect(positionFiltered).toHaveLength(1);
    expect(positionFiltered[0].symbol).toBe("VTI");
  });

  it("filters treemap nodes by account and relayouts the remaining nodes", () => {
    const treeMapNodes: TreeMapNode[] = [
      makeTreeMapNode({
        id: "funda-account-a",
        account: "Account A",
        value: 3300,
        x0: 0,
        x1: 600,
        y0: 0,
        y1: 400,
      }),
      makeTreeMapNode({
        id: "eqtya-account-a",
        symbol: "EQTY-A",
        name: "Synthetic Equity A",
        parentSymbol: "FUND-A",
        account: "Account A",
        value: 150,
        depth: 2,
        x0: 0,
        x1: 200,
        y0: 20,
        y1: 200,
      }),
      makeTreeMapNode({
        id: "funda-account-b",
        account: "Account B",
        value: 1000,
        x0: 780,
        x1: 1020,
        y0: 0,
        y1: 260,
      }),
      makeTreeMapNode({
        id: "eqtya-account-b",
        symbol: "EQTY-A",
        name: "Synthetic Equity A",
        parentSymbol: "FUND-A",
        account: "Account B",
        value: 45,
        depth: 2,
        x0: 780,
        x1: 920,
        y0: 20,
        y1: 150,
      }),
      makeTreeMapNode({
        id: "fundb-account-b",
        symbol: "FUND-B",
        name: "Synthetic Growth Fund",
        account: "Account B",
        value: 220,
        x0: 1030,
        x1: 1180,
        y0: 0,
        y1: 180,
      }),
    ];
    const portfolioData: PortfolioData = {
      treeMapNodes,
      tableRows: [],
      positionRows: [],
      summary: {
        totalValue: 4520,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        accounts: ["Account A", "Account B"],
        investmentTypes: ["ETFs"],
      },
      lastUpdated: new Date().toISOString(),
    };

    const filtered = getFilteredTreeMapNodes(portfolioData, {
      accounts: ["Account B"],
      investmentTypes: [],
    });

    expect(filtered).toHaveLength(3);
    expect(filtered.every((node) => node.account === "Account B")).toBe(true);

    const topLevelNodes = filtered.filter((node) => node.depth === 1);
    expect(Math.min(...topLevelNodes.map((node) => node.x0))).toBeLessThan(5);
    expect(Math.max(...topLevelNodes.map((node) => node.x1))).toBeGreaterThan(1190);
  });

  it("keeps the parent fund when a nested holding matches the search", () => {
    const portfolioData: PortfolioData = {
      treeMapNodes: [
        makeTreeMapNode({
          id: "fund-a",
          symbol: "FUND-A",
          name: "Synthetic Market Fund",
        }),
        makeTreeMapNode({
          id: "holding-a",
          symbol: "EQTY-A",
          name: "Synthetic Equity A",
          parentSymbol: "FUND-A",
          depth: 2,
        }),
        makeTreeMapNode({
          id: "fund-b",
          symbol: "FUND-B",
          name: "Synthetic Growth Fund",
          x0: 120,
          x1: 220,
        }),
      ],
      tableRows: [],
      positionRows: [],
      summary: {
        totalValue: 200,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        accounts: ["Account A"],
        investmentTypes: ["ETFs"],
      },
      lastUpdated: new Date().toISOString(),
    };

    const filtered = getFilteredTreeMapNodes(portfolioData, {
      accounts: [],
      investmentTypes: [],
      searchQuery: "eqty-a",
    });

    expect(filtered.map((node) => node.symbol)).toEqual(["FUND-A", "EQTY-A"]);
  });

  it("keeps nested holdings when a top-level fund matches the search", () => {
    const portfolioData: PortfolioData = {
      treeMapNodes: [
        makeTreeMapNode({
          id: "fund-a",
          symbol: "FUND-A",
          name: "Synthetic Market Fund",
        }),
        makeTreeMapNode({
          id: "holding-a",
          symbol: "EQTY-A",
          name: "Synthetic Equity A",
          parentSymbol: "FUND-A",
          depth: 2,
        }),
      ],
      tableRows: [],
      positionRows: [],
      summary: {
        totalValue: 100,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        accounts: ["Account A"],
        investmentTypes: ["ETFs"],
      },
      lastUpdated: new Date().toISOString(),
    };

    const filtered = getFilteredTreeMapNodes(portfolioData, {
      accounts: [],
      investmentTypes: [],
      searchQuery: "market",
    });

    expect(filtered.map((node) => node.symbol)).toEqual(["FUND-A", "EQTY-A"]);
  });

  it("filters the active summary by name or symbol search", () => {
    const positions = [
      makePosition({
        symbol: "EQTY-A",
        description: "Synthetic Equity A",
        currentValue: 300,
        totalGainLossDollar: 45,
        costBasisTotal: 255,
      }),
      makePosition({
        symbol: "EQTY-B",
        description: "Synthetic Equity B",
        currentValue: 150,
        totalGainLossDollar: 15,
        costBasisTotal: 135,
      }),
    ];

    const summary = getActivePortfolioSummary(
      positions,
      {
        accounts: [],
        investmentTypes: [],
        searchQuery: "equity a",
      },
      []
    );

    expect(summary).toMatchObject({
      value: 300,
      gainLoss: 45,
      label: "Search: equity a",
    });
    expect(summary?.gainLossPercent).toBeCloseTo(17.65, 2);
  });

  it("returns zero totals when the search has no matches", () => {
    const summary = getActivePortfolioSummary(
      [makePosition()],
      {
        accounts: [],
        investmentTypes: [],
        searchQuery: "missing",
      },
      []
    );

    expect(summary).toEqual({
      value: 0,
      gainLoss: 0,
      gainLossPercent: 0,
      label: "Search: missing",
    });
  });

  it("uses a filter count label for mixed active filters", () => {
    const summary = getActivePortfolioSummary(
      [makePosition()],
      {
        accounts: ["Account A"],
        investmentTypes: ["ETFs"],
        searchQuery: "market",
      },
      ["FUND-A"]
    );

    expect(summary).toMatchObject({
      value: 100,
      gainLoss: 10,
      label: "4 filters applied",
    });
  });

  it("uses a filter count label when search combines with a type filter", () => {
    const summary = getActivePortfolioSummary(
      [makePosition()],
      {
        accounts: [],
        investmentTypes: ["ETFs"],
        searchQuery: "market",
      },
      []
    );

    expect(summary).toMatchObject({
      value: 100,
      gainLoss: 10,
      label: "2 filters applied",
    });
  });
});
