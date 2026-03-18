import { describe, expect, it } from "vitest";
import {
  buildFlatHoldingTreeMapNodes,
  filterFundTreeMapNodes,
  getFundOptions,
} from "../treemap";
import type { FilterState, TableRow, TreeMapNode } from "../types";

const NO_FILTERS: FilterState = {
  investmentTypes: [],
  accounts: [],
};

function makeRow(overrides: Partial<TableRow>): TableRow {
  return {
    symbol: "MSFT",
    name: "Microsoft",
    accounts: ["Brokerage"],
    investmentTypes: ["Stocks"],
    totalValue: 0,
    percentOfPortfolio: 0,
    currentPrice: 400,
    totalGainLossDollar: 200,
    totalGainLossPercent: 20,
    fiftyTwoWeekHigh: 500,
    fiftyTwoWeekLow: 300,
    isExpandable: true,
    sources: [],
    ...overrides,
  };
}

describe("treemap helpers", () => {
  it("merges identical holdings across direct and fund sources", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "MSFT",
        accounts: ["Brokerage", "Roth IRA"],
        investmentTypes: ["Stocks", "ETFs"],
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Brokerage",
            value: 50,
            percentOfSource: 100,
            account: "Brokerage",
            investmentType: "Stocks",
          },
          {
            type: "fund",
            sourceSymbol: "VTI",
            sourceName: "Vanguard Total Stock Market",
            value: 200,
            percentOfSource: 3,
            account: "Brokerage",
            investmentType: "ETFs",
          },
          {
            type: "fund",
            sourceSymbol: "SPY",
            sourceName: "SPDR S&P 500",
            value: 150,
            percentOfSource: 2,
            account: "Brokerage",
            investmentType: "ETFs",
          },
          {
            type: "fund",
            sourceSymbol: "VTI",
            sourceName: "Vanguard Total Stock Market",
            value: 50,
            percentOfSource: 3,
            account: "Roth IRA",
            investmentType: "ETFs",
          },
        ],
      }),
      makeRow({
        symbol: "AAPL",
        name: "Apple",
        accounts: ["Brokerage"],
        investmentTypes: ["ETFs"],
        totalGainLossDollar: 0,
        totalGainLossPercent: 0,
        sources: [
          {
            type: "fund",
            sourceSymbol: "VTI",
            sourceName: "Vanguard Total Stock Market",
            value: 120,
            percentOfSource: 2,
            account: "Brokerage",
            investmentType: "ETFs",
          },
        ],
      }),
    ];

    const nodes = buildFlatHoldingTreeMapNodes({
      rows,
      filters: NO_FILTERS,
      selectedFunds: [],
      totalPortfolioValue: 1_000,
      width: 1200,
      height: 400,
    });

    expect(nodes).toHaveLength(2);
    expect(nodes.every((node) => node.depth === 1)).toBe(true);
    expect(nodes.find((node) => node.symbol === "MSFT")?.value).toBe(450);
    expect(nodes.find((node) => node.symbol === "AAPL")?.value).toBe(120);
  });

  it("recalculates flat node values for selected funds and account filters", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "MSFT",
        accounts: ["Brokerage", "Roth IRA"],
        investmentTypes: ["Stocks", "ETFs"],
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Brokerage",
            value: 50,
            percentOfSource: 100,
            account: "Brokerage",
            investmentType: "Stocks",
          },
          {
            type: "fund",
            sourceSymbol: "VTI",
            sourceName: "Vanguard Total Stock Market",
            value: 200,
            percentOfSource: 3,
            account: "Brokerage",
            investmentType: "ETFs",
          },
          {
            type: "fund",
            sourceSymbol: "VTI",
            sourceName: "Vanguard Total Stock Market",
            value: 50,
            percentOfSource: 3,
            account: "Roth IRA",
            investmentType: "ETFs",
          },
        ],
      }),
      makeRow({
        symbol: "FZFXX",
        name: "Fidelity Treasury Fund",
        accounts: ["Brokerage"],
        investmentTypes: ["Mutual Funds"],
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Brokerage",
            value: 120,
            percentOfSource: 100,
            account: "Brokerage",
            investmentType: "Mutual Funds",
          },
        ],
      }),
    ];

    const selectedFundNodes = buildFlatHoldingTreeMapNodes({
      rows,
      filters: { investmentTypes: [], accounts: ["Brokerage"] },
      selectedFunds: ["VTI", "FZFXX"],
      totalPortfolioValue: 1_000,
      width: 1200,
      height: 400,
    });

    expect(selectedFundNodes.find((node) => node.symbol === "MSFT")?.value).toBe(200);
    expect(selectedFundNodes.find((node) => node.symbol === "FZFXX")?.value).toBe(120);
    expect(selectedFundNodes).toHaveLength(2);
  });

  it("returns only selectable fund chips and filters grouped nodes by selection", () => {
    const groupedNodes: TreeMapNode[] = [
      {
        id: "vti-1-1",
        symbol: "VTI",
        name: "Vanguard Total Stock Market",
        value: 1000,
        color: "#4E9999",
        percentOfPortfolio: 25,
        x0: 0,
        y0: 0,
        x1: 500,
        y1: 200,
        depth: 1,
        investmentType: "ETFs",
      },
      {
        id: "msft-2-2",
        symbol: "MSFT",
        name: "Microsoft",
        value: 200,
        color: "#80BABA",
        parentSymbol: "VTI",
        percentOfPortfolio: 5,
        x0: 0,
        y0: 20,
        x1: 200,
        y1: 200,
        depth: 2,
      },
      {
        id: "vti-1-dup",
        symbol: "VTI",
        name: "Vanguard Total Stock Market",
        value: 400,
        color: "#4E9999",
        percentOfPortfolio: 10,
        x0: 0,
        y0: 200,
        x1: 250,
        y1: 300,
        depth: 1,
        investmentType: "ETFs",
      },
      {
        id: "msft-1-3",
        symbol: "MSFT",
        name: "Microsoft",
        value: 500,
        color: "#8B74AB",
        percentOfPortfolio: 12.5,
        x0: 500,
        y0: 0,
        x1: 800,
        y1: 200,
        depth: 1,
        investmentType: "Stocks",
      },
      {
        id: "fzfxx-1-4",
        symbol: "FZFXX",
        name: "Fidelity Treasury Fund",
        value: 300,
        color: "#C49A5C",
        percentOfPortfolio: 7.5,
        x0: 800,
        y0: 0,
        x1: 1000,
        y1: 200,
        depth: 1,
        investmentType: "Mutual Funds",
      },
    ];

    expect(getFundOptions(groupedNodes)).toEqual([
      {
        symbol: "VTI",
        name: "Vanguard Total Stock Market",
        color: "#4E9999",
        value: 1400,
        hasChildren: true,
      },
      {
        symbol: "FZFXX",
        name: "Fidelity Treasury Fund",
        color: "#C49A5C",
        value: 300,
        hasChildren: false,
      },
    ]);

    expect(filterFundTreeMapNodes(groupedNodes, ["VTI"])).toEqual([
      groupedNodes[0],
      groupedNodes[1],
      groupedNodes[2],
    ]);
  });
});
