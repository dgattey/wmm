import { describe, expect, it } from "vitest";
import { getFilteredRows, getFilteredTreeMapNodes } from "./usePortfolio";
import type { PortfolioData, TableRow, TreeMapNode } from "@/lib/types";

const SORT_CONFIG = { key: "totalValue", direction: "desc" } as const;

function makeRow(overrides: Partial<TableRow>): TableRow {
  return {
    symbol: "VTI",
    name: "Vanguard Total Stock Market ETF",
    accounts: ["Brokerage", "Roth IRA"],
    investmentTypes: ["ETFs"],
    totalValue: 0,
    percentOfPortfolio: 0,
    currentPrice: 330,
    totalGainLossDollar: 0,
    totalGainLossPercent: 0,
    fiftyTwoWeekHigh: 340,
    fiftyTwoWeekLow: 280,
    isExpandable: false,
    sources: [],
    ...overrides,
  };
}

function makeTreeMapNode(overrides: Partial<TreeMapNode>): TreeMapNode {
  return {
    id: "node-1",
    symbol: "VTI",
    name: "Vanguard Total Stock Market ETF",
    value: 100,
    color: "#4E9999",
    percentOfPortfolio: 10,
    x0: 0,
    y0: 0,
    x1: 100,
    y1: 100,
    depth: 1,
    investmentType: "ETFs",
    account: "Brokerage",
    ...overrides,
  };
}

describe("usePortfolio filtering helpers", () => {
  it("recalculates row totals from matching account sources", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "VTI",
        totalValue: 42900,
        totalGainLossDollar: 3900,
        totalGainLossPercent: 10,
        isExpandable: true,
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Brokerage",
            value: 33000,
            percentOfSource: 100,
            percentOfPortfolio: 73.33,
            account: "Brokerage",
            investmentType: "ETFs",
            totalGainLossDollar: 3000,
            costBasisTotal: 30000,
          },
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Roth IRA",
            value: 9900,
            percentOfSource: 100,
            percentOfPortfolio: 22,
            account: "Roth IRA",
            investmentType: "ETFs",
            totalGainLossDollar: 900,
            costBasisTotal: 9000,
          },
        ],
      }),
      makeRow({
        symbol: "VOOG",
        name: "Vanguard S&P 500 Growth ETF",
        accounts: ["Roth IRA"],
        totalValue: 2150,
        totalGainLossDollar: 150,
        totalGainLossPercent: 7.5,
        isExpandable: false,
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Roth IRA",
            value: 2150,
            percentOfSource: 100,
            percentOfPortfolio: 4.78,
            account: "Roth IRA",
            investmentType: "ETFs",
            totalGainLossDollar: 150,
            costBasisTotal: 2000,
          },
        ],
      }),
    ];

    const filtered = getFilteredRows(
      rows,
      { accounts: ["Roth IRA"], investmentTypes: [] },
      SORT_CONFIG,
      []
    );

    expect(filtered).toHaveLength(2);
    expect(filtered[0]).toMatchObject({
      symbol: "VTI",
      accounts: ["Roth IRA"],
      totalValue: 9900,
      totalGainLossDollar: 900,
      totalGainLossPercent: 10,
      isExpandable: false,
    });
    expect(filtered[0].percentOfPortfolio).toBeCloseTo(82.16, 2);
    expect(filtered[0].sources).toEqual([
      expect.objectContaining({
        account: "Roth IRA",
        value: 9900,
      }),
    ]);
    expect(filtered[1]).toMatchObject({
      symbol: "VOOG",
      accounts: ["Roth IRA"],
      totalValue: 2150,
      totalGainLossDollar: 150,
    });
  });

  it("filters treemap nodes by account and relayouts the remaining nodes", () => {
    const treeMapNodes: TreeMapNode[] = [
      makeTreeMapNode({
        id: "vti-brokerage",
        account: "Brokerage",
        value: 33000,
        x0: 0,
        x1: 600,
        y0: 0,
        y1: 400,
      }),
      makeTreeMapNode({
        id: "msft-brokerage",
        symbol: "MSFT",
        name: "Microsoft",
        parentSymbol: "VTI",
        account: "Brokerage",
        value: 1500,
        depth: 2,
        x0: 0,
        x1: 200,
        y0: 20,
        y1: 200,
      }),
      makeTreeMapNode({
        id: "vti-roth",
        account: "Roth IRA",
        value: 9900,
        x0: 780,
        x1: 1020,
        y0: 0,
        y1: 260,
      }),
      makeTreeMapNode({
        id: "msft-roth",
        symbol: "MSFT",
        name: "Microsoft",
        parentSymbol: "VTI",
        account: "Roth IRA",
        value: 420,
        depth: 2,
        x0: 780,
        x1: 920,
        y0: 20,
        y1: 150,
      }),
      makeTreeMapNode({
        id: "voog-roth",
        symbol: "VOOG",
        name: "Vanguard S&P 500 Growth ETF",
        account: "Roth IRA",
        value: 2150,
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
        totalValue: 45050,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        accounts: ["Brokerage", "Roth IRA"],
        investmentTypes: ["ETFs"],
      },
      lastUpdated: new Date().toISOString(),
    };

    const filtered = getFilteredTreeMapNodes(portfolioData, {
      accounts: ["Roth IRA"],
      investmentTypes: [],
    });

    expect(filtered).toHaveLength(3);
    expect(filtered.every((node) => node.account === "Roth IRA")).toBe(true);

    const topLevelNodes = filtered.filter((node) => node.depth === 1);
    expect(Math.min(...topLevelNodes.map((node) => node.x0))).toBeLessThan(5);
    expect(Math.max(...topLevelNodes.map((node) => node.x1))).toBeGreaterThan(1190);
  });
});
