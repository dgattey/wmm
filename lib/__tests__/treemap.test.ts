import { describe, expect, it } from "vitest";
import {
  buildFlatHoldingTreeMapNodes,
  filterAndRelayoutFundTreeMapNodes,
  filterFundTreeMapNodes,
  getFundOptions,
} from "../treemap";
import type { FilterState, PositionSource, TableRow, TreeMapNode } from "../types";

const NO_FILTERS: FilterState = {
  investmentTypes: [],
  accounts: [],
};

function makeRow(overrides: Partial<TableRow>): TableRow {
  return {
    symbol: "EQTY-A",
    name: "Synthetic Equity A",
    accounts: ["Account A"],
    investmentTypes: ["Stocks"],
    totalValue: 0,
    percentOfPortfolio: 0,
    currentPrice: 40,
    totalGainLossDollar: 8,
    totalGainLossPercent: 20,
    fiftyTwoWeekHigh: 48,
    fiftyTwoWeekLow: 28,
    isExpandable: true,
    sources: [],
    ...overrides,
  };
}

function makeSource(overrides: Partial<PositionSource>): PositionSource {
  return {
    type: "direct",
    sourceSymbol: "DIRECT",
    sourceName: "Brokerage",
    value: 0,
    percentOfSource: 0,
    percentOfPortfolio: 0,
    account: "Brokerage",
    investmentType: "Stocks",
    ...overrides,
  };
}

describe("treemap helpers", () => {
  it("merges identical holdings across direct and fund sources", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "EQTY-A",
        accounts: ["Account A", "Account B"],
        investmentTypes: ["Stocks", "ETFs"],
        sources: [
          makeSource({
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Account A",
            value: 50,
            percentOfSource: 100,
            account: "Account A",
            investmentType: "Stocks",
          }),
          makeSource({
            type: "fund",
            sourceSymbol: "FUND-A",
            sourceName: "Synthetic Market Fund",
            value: 200,
            percentOfSource: 3,
            account: "Account A",
            investmentType: "ETFs",
          }),
          makeSource({
            type: "fund",
            sourceSymbol: "FUND-B",
            sourceName: "Synthetic Blend Fund",
            value: 150,
            percentOfSource: 2,
            account: "Account A",
            investmentType: "ETFs",
          }),
          makeSource({
            type: "fund",
            sourceSymbol: "FUND-A",
            sourceName: "Synthetic Market Fund",
            value: 50,
            percentOfSource: 3,
            account: "Account B",
            investmentType: "ETFs",
          }),
        ],
      }),
      makeRow({
        symbol: "EQTY-B",
        name: "Synthetic Equity B",
        accounts: ["Account A"],
        investmentTypes: ["ETFs"],
        totalGainLossDollar: 0,
        totalGainLossPercent: 0,
        sources: [
          makeSource({
            type: "fund",
            sourceSymbol: "FUND-A",
            sourceName: "Synthetic Market Fund",
            value: 120,
            percentOfSource: 2,
            account: "Account A",
            investmentType: "ETFs",
          }),
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
    expect(nodes.find((node) => node.symbol === "EQTY-A")?.value).toBe(450);
    expect(nodes.find((node) => node.symbol === "EQTY-B")?.value).toBe(120);
  });

  it("recalculates flat node values for selected funds and account filters", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "EQTY-A",
        accounts: ["Account A", "Account B"],
        investmentTypes: ["Stocks", "ETFs"],
        sources: [
          makeSource({
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Account A",
            value: 50,
            percentOfSource: 100,
            account: "Account A",
            investmentType: "Stocks",
          }),
          makeSource({
            type: "fund",
            sourceSymbol: "FUND-A",
            sourceName: "Synthetic Market Fund",
            value: 200,
            percentOfSource: 3,
            account: "Account A",
            investmentType: "ETFs",
          }),
          makeSource({
            type: "fund",
            sourceSymbol: "FUND-A",
            sourceName: "Synthetic Market Fund",
            value: 50,
            percentOfSource: 3,
            account: "Account B",
            investmentType: "ETFs",
          }),
        ],
      }),
      makeRow({
        symbol: "FUND-C",
        name: "Synthetic Income Fund",
        accounts: ["Account A"],
        investmentTypes: ["Mutual Funds"],
        sources: [
          makeSource({
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Account A",
            value: 120,
            percentOfSource: 100,
            account: "Account A",
            investmentType: "Mutual Funds",
          }),
        ],
      }),
    ];

    const selectedFundNodes = buildFlatHoldingTreeMapNodes({
      rows,
      filters: { investmentTypes: [], accounts: ["Account A"] },
      selectedFunds: ["FUND-A", "FUND-C"],
      totalPortfolioValue: 1_000,
      width: 1200,
      height: 400,
    });

    expect(selectedFundNodes.find((node) => node.symbol === "EQTY-A")?.value).toBe(200);
    expect(selectedFundNodes.find((node) => node.symbol === "FUND-C")?.value).toBe(120);
    expect(selectedFundNodes).toHaveLength(2);
  });

  it("keeps flat holding colors stable when other rows are filtered out", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "EQTY-A",
        accounts: ["Account A"],
        sources: [
          makeSource({
            type: "direct",
            sourceName: "Account A",
            value: 250,
            percentOfSource: 100,
            account: "Account A",
            investmentType: "Stocks",
          }),
        ],
      }),
      makeRow({
        symbol: "EQTY-B",
        name: "Synthetic Equity B",
        accounts: ["Account B"],
        sources: [
          makeSource({
            type: "direct",
            sourceName: "Account B",
            value: 150,
            percentOfSource: 100,
            account: "Account B",
            investmentType: "Stocks",
          }),
        ],
      }),
    ];

    const allNodes = buildFlatHoldingTreeMapNodes({
      rows,
      filters: NO_FILTERS,
      selectedFunds: [],
      totalPortfolioValue: 400,
      width: 1200,
      height: 400,
    });
    const filteredNodes = buildFlatHoldingTreeMapNodes({
      rows,
      filters: { investmentTypes: [], accounts: ["Account A"] },
      selectedFunds: [],
      totalPortfolioValue: 250,
      width: 1200,
      height: 400,
    });

    expect(allNodes.find((node) => node.symbol === "EQTY-A")?.color).toBe(
      filteredNodes.find((node) => node.symbol === "EQTY-A")?.color
    );
  });

  it("filters flat holdings by name, symbol, or matching fund source", () => {
    const rows: TableRow[] = [
      makeRow({
        symbol: "EQTY-A",
        name: "Synthetic Equity A",
        accounts: ["Account A"],
        sources: [
          makeSource({
            type: "fund",
            sourceSymbol: "FUND-A",
            sourceName: "Synthetic Market Fund",
            value: 200,
            percentOfSource: 3,
            account: "Account A",
            investmentType: "ETFs",
          }),
        ],
      }),
      makeRow({
        symbol: "EQTY-B",
        name: "Synthetic Equity B",
        accounts: ["Account A"],
        sources: [
          makeSource({
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: "Account A",
            value: 150,
            percentOfSource: 100,
            account: "Account A",
            investmentType: "Stocks",
          }),
        ],
      }),
    ];

    const matchedByFund = buildFlatHoldingTreeMapNodes({
      rows,
      filters: { investmentTypes: [], accounts: [], searchQuery: "fund-a" },
      selectedFunds: [],
      totalPortfolioValue: 350,
      width: 1200,
      height: 400,
    });
    const matchedByName = buildFlatHoldingTreeMapNodes({
      rows,
      filters: { investmentTypes: [], accounts: [], searchQuery: "equity b" },
      selectedFunds: [],
      totalPortfolioValue: 350,
      width: 1200,
      height: 400,
    });

    expect(matchedByFund.map((node) => node.symbol)).toEqual(["EQTY-A"]);
    expect(matchedByName.map((node) => node.symbol)).toEqual(["EQTY-B"]);
  });

  it("returns only selectable fund chips and filters grouped nodes by selection", () => {
    const groupedNodes: TreeMapNode[] = [
      {
        id: "fund-a-1-1",
        symbol: "FUND-A",
        name: "Synthetic Market Fund",
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
        id: "eqty-a-2-2",
        symbol: "EQTY-A",
        name: "Synthetic Equity A",
        value: 200,
        color: "#80BABA",
        parentSymbol: "FUND-A",
        percentOfPortfolio: 5,
        x0: 0,
        y0: 20,
        x1: 200,
        y1: 200,
        depth: 2,
      },
      {
        id: "fund-a-1-dup",
        symbol: "FUND-A",
        name: "Synthetic Market Fund",
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
        id: "eqty-a-1-3",
        symbol: "EQTY-A",
        name: "Synthetic Equity A",
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
        id: "fund-c-1-4",
        symbol: "FUND-C",
        name: "Synthetic Income Fund",
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
        symbol: "FUND-A",
        name: "Synthetic Market Fund",
        color: "#4E9999",
        value: 1400,
        hasChildren: true,
      },
      {
        symbol: "FUND-C",
        name: "Synthetic Income Fund",
        color: "#C49A5C",
        value: 300,
        hasChildren: false,
      },
    ]);

    expect(filterFundTreeMapNodes(groupedNodes, ["FUND-A"])).toEqual([
      groupedNodes[0],
      groupedNodes[1],
      groupedNodes[2],
    ]);
  });

  it("relayouts selected fund treemap nodes to avoid empty gaps", () => {
    const groupedNodes: TreeMapNode[] = [
      {
        id: "fund-a-1-1",
        symbol: "FUND-A",
        name: "Synthetic Market Fund",
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
        id: "eqty-a-2-2",
        symbol: "EQTY-A",
        name: "Synthetic Equity A",
        value: 200,
        color: "#80BABA",
        parentSymbol: "FUND-A",
        percentOfPortfolio: 5,
        x0: 0,
        y0: 20,
        x1: 200,
        y1: 200,
        depth: 2,
      },
      {
        id: "fund-c-1-4",
        symbol: "FUND-C",
        name: "Synthetic Income Fund",
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

    const relaidOutNodes = filterAndRelayoutFundTreeMapNodes(
      groupedNodes,
      ["FUND-A"],
      1200,
      400
    );
    const topLevelNodes = relaidOutNodes.filter((node) => node.depth === 1);

    expect(Math.min(...topLevelNodes.map((node) => node.x0))).toBeLessThan(5);
    expect(Math.max(...topLevelNodes.map((node) => node.x1))).toBeGreaterThan(1190);
  });
});
