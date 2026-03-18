import {
  hierarchy,
  treemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from "d3-hierarchy";
import type {
  FidelityPosition,
  QuoteData,
  FundHolding,
  PortfolioData,
  TreeMapNode,
  TableRow,
  PositionSource,
  PortfolioSummary,
} from "../types";
import { assignColors, getChildColor } from "./colors";

// === Intermediate types for treemap hierarchy ===

interface HierarchyData {
  name: string;
  symbol: string;
  value?: number;
  color?: string;
  meta?: TreeMapNodeMeta;
  children?: HierarchyData[];
}

interface TreeMapNodeMeta {
  parentSymbol?: string;
  parentName?: string;
  percentOfParent?: number;
  percentOfPortfolio: number;
  currentPrice?: number;
  totalGainLossDollar?: number;
  totalGainLossPercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  investmentType?: string;
  account?: string;
}

// === Main entry point ===

export function computePortfolioData(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  holdings: Record<string, FundHolding[]>,
  layoutWidth: number,
  layoutHeight: number
): PortfolioData {
  const totalValue = computeTotalValue(positions);
  const totalGainLoss = positions.reduce(
    (sum, p) => sum + p.totalGainLossDollar,
    0
  );
  const totalCostBasis = positions.reduce(
    (sum, p) => sum + p.costBasisTotal,
    0
  );

  const treeMapNodes = buildTreeMap(
    positions,
    quotes,
    holdings,
    totalValue,
    layoutWidth,
    layoutHeight
  );

  // Build both table views
  const tableRows = buildHoldingsView(positions, quotes, holdings, totalValue);
  const positionRows = buildPositionsView(positions, quotes, totalValue);

  const summary: PortfolioSummary = {
    totalValue,
    totalGainLoss,
    totalGainLossPercent:
      totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
    accounts: [...new Set(positions.map((p) => p.accountName))],
    investmentTypes: [...new Set(positions.map((p) => p.investmentType))],
  };

  return {
    treeMapNodes,
    tableRows,
    positionRows,
    summary,
    lastUpdated: new Date().toISOString(),
  };
}

// === Total value ===

function computeTotalValue(positions: FidelityPosition[]): number {
  return positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
}

// === TreeMap building — ALL holdings, no "Other" bucket ===

function buildTreeMap(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  holdings: Record<string, FundHolding[]>,
  totalValue: number,
  width: number,
  height: number
): TreeMapNode[] {
  const funds = positions.filter(
    (p) =>
      p.investmentType === "ETFs" ||
      p.investmentType === "Mutual Funds" ||
      p.investmentType === "Others"
  );
  const stocks = positions.filter((p) => p.investmentType === "Stocks");
  const cash = positions.filter((p) => p.investmentType === "Cash");

  const fundSymbols = funds.map((f) => f.symbol);
  const colorMap = assignColors(fundSymbols);

  const children: HierarchyData[] = [];

  // Add fund groups with ALL their holdings (no cap, no "Other")
  for (const fund of funds) {
    const fundHoldings = holdings[fund.symbol] || [];
    const quote = quotes[fund.symbol];
    const fundColor = colorMap[fund.symbol] || {
      base: "#64748b",
      light: "#94a3b8",
    };

    if (fundHoldings.length > 0) {
      const fundChildren: HierarchyData[] = fundHoldings.map((h, idx) => {
        const holdingQuote = quotes[h.symbol];
        const holdingValue = fund.currentValue * h.holdingPercent;
        return {
          name: h.holdingName,
          symbol: h.symbol,
          value: holdingValue,
          color: getChildColor(fundColor.base, idx),
          meta: {
            parentSymbol: fund.symbol,
            parentName: fund.description,
            percentOfParent: h.holdingPercent * 100,
            percentOfPortfolio:
              totalValue > 0 ? (holdingValue / totalValue) * 100 : 0,
            currentPrice: holdingQuote?.regularMarketPrice,
            totalGainLossDollar: holdingQuote?.regularMarketChange,
            totalGainLossPercent: holdingQuote?.regularMarketChangePercent,
            fiftyTwoWeekHigh: holdingQuote?.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: holdingQuote?.fiftyTwoWeekLow,
            investmentType: fund.investmentType,
            account: fund.accountName,
          },
        };
      });

      children.push({
        name: fund.description,
        symbol: fund.symbol,
        color: fundColor.base,
        children: fundChildren,
        meta: {
          percentOfPortfolio:
            totalValue > 0 ? (fund.currentValue / totalValue) * 100 : 0,
          currentPrice: quote?.regularMarketPrice ?? fund.lastPrice,
          totalGainLossDollar: fund.totalGainLossDollar,
          totalGainLossPercent: fund.totalGainLossPercent,
          fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
          investmentType: fund.investmentType,
          account: fund.accountName,
        },
      });
    } else {
      // Fund without holdings data — show as single leaf
      children.push({
        name: fund.description,
        symbol: fund.symbol,
        value: fund.currentValue,
        color: fundColor.base,
        meta: {
          percentOfPortfolio:
            totalValue > 0 ? (fund.currentValue / totalValue) * 100 : 0,
          currentPrice: quote?.regularMarketPrice ?? fund.lastPrice,
          totalGainLossDollar: fund.totalGainLossDollar,
          totalGainLossPercent: fund.totalGainLossPercent,
          fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
          investmentType: fund.investmentType,
          account: fund.accountName,
        },
      });
    }
  }

  // Add individual stocks with color offset
  const stockColorOffset = funds.length;
  const stockSymbols = stocks.map((s) => s.symbol);
  const stockColors = assignColors([
    ...Array(stockColorOffset).fill("_pad"),
    ...stockSymbols,
  ]);

  for (const stock of stocks) {
    const quote = quotes[stock.symbol];
    const stockColor = stockColors[stock.symbol] || {
      base: "#64748b",
      light: "#94a3b8",
    };
    children.push({
      name: stock.description,
      symbol: stock.symbol,
      value: stock.currentValue,
      color: stockColor.base,
      meta: {
        percentOfPortfolio:
          totalValue > 0 ? (stock.currentValue / totalValue) * 100 : 0,
        currentPrice: quote?.regularMarketPrice ?? stock.lastPrice,
        totalGainLossDollar: stock.totalGainLossDollar,
        totalGainLossPercent: stock.totalGainLossPercent,
        fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
        investmentType: stock.investmentType,
        account: stock.accountName,
      },
    });
  }

  // Add cash positions
  for (const c of cash) {
    if (c.currentValue > 0) {
      children.push({
        name: c.description || "Cash",
        symbol: c.symbol,
        value: c.currentValue,
        color: "#94a3b8",
        meta: {
          percentOfPortfolio:
            totalValue > 0 ? (c.currentValue / totalValue) * 100 : 0,
          investmentType: "Cash",
          account: c.accountName,
        },
      });
    }
  }

  if (children.length === 0) return [];

  const root: HierarchyData = {
    name: "Portfolio",
    symbol: "ROOT",
    children,
  };

  const h = hierarchy(root)
    .sum((d) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const treemapLayout = treemap<HierarchyData>()
    .size([width, height])
    .tile(treemapSquarify)
    .paddingOuter(3)
    .paddingTop(20)
    .paddingInner(2);

  const laid = treemapLayout(h);

  const nodes: TreeMapNode[] = [];
  flattenNode(laid, nodes);
  return nodes;
}

let nodeCounter = 0;

function flattenNode(
  node: HierarchyRectangularNode<HierarchyData>,
  result: TreeMapNode[]
): void {
  if (node.depth === 0) {
    nodeCounter = 0;
    if (node.children) {
      for (const child of node.children) {
        flattenNode(child, result);
      }
    }
    return;
  }

  const d = node.data;
  const meta = d.meta || { percentOfPortfolio: 0 };
  nodeCounter++;

  result.push({
    id: `${d.symbol}-${node.depth}-${nodeCounter}`,
    symbol: d.symbol,
    name: d.name,
    value: node.value || 0,
    color: d.color || "#64748b",
    parentSymbol: meta.parentSymbol,
    parentName: meta.parentName,
    percentOfParent: meta.percentOfParent,
    percentOfPortfolio: meta.percentOfPortfolio,
    x0: node.x0,
    y0: node.y0,
    x1: node.x1,
    y1: node.y1,
    depth: node.depth,
    currentPrice: meta.currentPrice,
    totalGainLossDollar: meta.totalGainLossDollar,
    totalGainLossPercent: meta.totalGainLossPercent,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    investmentType: meta.investmentType,
    account: meta.account,
  });

  if (node.children) {
    for (const child of node.children) {
      flattenNode(child, result);
    }
  }
}

// === TABLE: Holdings view (aggregated by underlying symbol) ===
// No fund-level rows. Everything aggregated by underlying stock symbol.

function buildHoldingsView(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  holdings: Record<string, FundHolding[]>,
  totalValue: number
): TableRow[] {
  const rowMap = new Map<
    string,
    {
      symbol: string;
      name: string;
      totalDirectValue: number;
      totalGainLossDollar: number;
      costBasis: number;
      investmentTypes: Set<string>;
      accounts: Set<string>;
      sources: PositionSource[];
    }
  >();

  // 1. Add positions that should remain as direct rows in holdings view.
  // If we have constituent holdings for a fund, we'll decompose it below instead.
  for (const pos of positions) {
    const hasHoldingsData = (holdings[pos.symbol]?.length ?? 0) > 0;
    if (hasHoldingsData) {
      continue;
    }

    const key = pos.symbol;
    const existing = rowMap.get(key);
    if (existing) {
      existing.totalDirectValue += pos.currentValue;
      existing.totalGainLossDollar += pos.totalGainLossDollar;
      existing.costBasis += pos.costBasisTotal;
      existing.investmentTypes.add(pos.investmentType);
      existing.accounts.add(pos.accountName);
      existing.sources.push({
        type: "direct",
        sourceSymbol: "DIRECT",
        sourceName: pos.accountName,
        value: pos.currentValue,
        percentOfSource: 100,
        account: pos.accountName,
        investmentType: pos.investmentType,
      });
    } else {
      rowMap.set(key, {
        symbol: pos.symbol,
        name:
          quotes[pos.symbol]?.longName ||
          quotes[pos.symbol]?.shortName ||
          pos.description,
        totalDirectValue: pos.currentValue,
        totalGainLossDollar: pos.totalGainLossDollar,
        costBasis: pos.costBasisTotal,
        investmentTypes: new Set([pos.investmentType]),
        accounts: new Set([pos.accountName]),
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: pos.accountName,
            value: pos.currentValue,
            percentOfSource: 100,
            account: pos.accountName,
            investmentType: pos.investmentType,
          },
        ],
      });
    }
  }

  // 2. Decompose only positions with actual constituent holdings data
  const fundPositions = positions.filter(
    (p) => (holdings[p.symbol]?.length ?? 0) > 0
  );

  for (const fund of fundPositions) {
    const fundHoldings = holdings[fund.symbol] || [];

    // Distribute fund value across its holdings
    for (const h of fundHoldings) {
      if (!h.symbol) continue;
      const holdingValue = fund.currentValue * h.holdingPercent;
      const existing = rowMap.get(h.symbol);

      if (existing) {
        existing.accounts.add(fund.accountName);
        existing.investmentTypes.add(fund.investmentType);
        existing.sources.push({
          type: "fund",
          sourceSymbol: fund.symbol,
          sourceName: fund.description,
          value: holdingValue,
          percentOfSource: h.holdingPercent * 100,
          account: fund.accountName,
          investmentType: fund.investmentType,
        });
      } else {
        const hQuote = quotes[h.symbol];
        rowMap.set(h.symbol, {
          symbol: h.symbol,
          name:
            h.symbol === fund.symbol
              ? h.holdingName
              : hQuote?.longName || hQuote?.shortName || h.holdingName,
          totalDirectValue: 0,
          totalGainLossDollar: 0,
          costBasis: 0,
          investmentTypes: new Set([fund.investmentType]),
          accounts: new Set([fund.accountName]),
          sources: [
            {
              type: "fund",
              sourceSymbol: fund.symbol,
              sourceName: fund.description,
              value: holdingValue,
              percentOfSource: h.holdingPercent * 100,
              account: fund.accountName,
              investmentType: fund.investmentType,
            },
          ],
        });
      }
    }
  }

  // 3. Convert to TableRow[]
  return convertToTableRows(rowMap, quotes, positions, totalValue);
}

// === TABLE: Positions view (original per-position, including fund rows) ===

function buildPositionsView(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  totalValue: number
): TableRow[] {
  const rowMap = new Map<
    string,
    {
      symbol: string;
      name: string;
      totalDirectValue: number;
      totalGainLossDollar: number;
      costBasis: number;
      investmentTypes: Set<string>;
      accounts: Set<string>;
      sources: PositionSource[];
    }
  >();

  for (const pos of positions) {
    const key = pos.symbol;
    const existing = rowMap.get(key);
    if (existing) {
      existing.totalDirectValue += pos.currentValue;
      existing.totalGainLossDollar += pos.totalGainLossDollar;
      existing.costBasis += pos.costBasisTotal;
      existing.investmentTypes.add(pos.investmentType);
      existing.accounts.add(pos.accountName);
      existing.sources.push({
        type: "direct",
        sourceSymbol: "DIRECT",
        sourceName: pos.accountName,
        value: pos.currentValue,
        percentOfSource: 100,
        account: pos.accountName,
        investmentType: pos.investmentType,
      });
    } else {
      rowMap.set(key, {
        symbol: pos.symbol,
        name:
          quotes[pos.symbol]?.longName ||
          quotes[pos.symbol]?.shortName ||
          pos.description,
        totalDirectValue: pos.currentValue,
        totalGainLossDollar: pos.totalGainLossDollar,
        costBasis: pos.costBasisTotal,
        investmentTypes: new Set([pos.investmentType]),
        accounts: new Set([pos.accountName]),
        sources: [
          {
            type: "direct",
            sourceSymbol: "DIRECT",
            sourceName: pos.accountName,
            value: pos.currentValue,
            percentOfSource: 100,
            account: pos.accountName,
            investmentType: pos.investmentType,
          },
        ],
      });
    }
  }

  return convertToTableRows(rowMap, quotes, positions, totalValue);
}

// === Shared: convert rowMap to TableRow[] ===

function convertToTableRows(
  rowMap: Map<
    string,
    {
      symbol: string;
      name: string;
      totalDirectValue: number;
      totalGainLossDollar: number;
      costBasis: number;
      investmentTypes: Set<string>;
      accounts: Set<string>;
      sources: PositionSource[];
    }
  >,
  quotes: Record<string, QuoteData>,
  positions: FidelityPosition[],
  totalValue: number
): TableRow[] {
  const rows: TableRow[] = [];

  for (const [, data] of rowMap) {
    const quote = quotes[data.symbol];

    const directValue = data.totalDirectValue;
    const fundSliceValue = data.sources
      .filter((s) => s.type === "fund")
      .reduce((sum, s) => sum + s.value, 0);
    const combinedValue = directValue + fundSliceValue;

    const hasMultipleSources = data.sources.length > 1;

    rows.push({
      symbol: data.symbol,
      name: data.name,
      accounts: [...data.accounts],
      investmentTypes: [...data.investmentTypes],
      totalValue: combinedValue,
      percentOfPortfolio:
        totalValue > 0 ? (combinedValue / totalValue) * 100 : 0,
      currentPrice:
        quote?.regularMarketPrice || findLastPrice(positions, data.symbol),
      totalGainLossDollar: data.totalGainLossDollar,
      totalGainLossPercent:
        data.costBasis > 0
          ? (data.totalGainLossDollar / data.costBasis) * 100
          : 0,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow || 0,
      isExpandable: hasMultipleSources,
      sources: data.sources,
    });
  }

  return rows;
}

function findLastPrice(
  positions: FidelityPosition[],
  symbol: string
): number {
  const pos = positions.find((p) => p.symbol === symbol);
  return pos?.lastPrice || 0;
}
