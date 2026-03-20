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
import { DEFAULT_TREEMAP_COLOR, getColorForSymbol } from "../colors";
import { isFundInvestmentType } from "../investmentTypes";

// === Shared row-building types ===

interface RowAccumulator {
  symbol: string;
  name: string;
  totalDirectValue: number;
  totalGainLossDollar: number;
  costBasis: number;
  investmentTypes: Set<string>;
  accounts: Set<string>;
  sources: PositionSource[];
}

function percentOf(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

function createDirectSource(pos: FidelityPosition, totalValue: number): PositionSource {
  return {
    type: "direct",
    sourceSymbol: "DIRECT",
    sourceName: pos.accountName,
    value: pos.currentValue,
    percentOfSource: 100,
    percentOfPortfolio: percentOf(pos.currentValue, totalValue),
    account: pos.accountName,
    investmentType: pos.investmentType,
    totalGainLossDollar: pos.totalGainLossDollar,
    costBasisTotal: pos.costBasisTotal,
  };
}

function createFundSource(
  fund: FidelityPosition,
  holdingValue: number,
  holdingPercent: number,
  totalValue: number
): PositionSource {
  return {
    type: "fund",
    sourceSymbol: fund.symbol,
    sourceName: fund.description,
    value: holdingValue,
    percentOfSource: holdingPercent * 100,
    percentOfPortfolio: percentOf(holdingValue, totalValue),
    account: fund.accountName,
    investmentType: fund.investmentType,
    totalGainLossDollar: 0,
    costBasisTotal: 0,
  };
}

function addDirectPositionToRow(
  rowMap: Map<string, RowAccumulator>,
  pos: FidelityPosition,
  quotes: Record<string, QuoteData>,
  totalValue: number
): void {
  const existing = rowMap.get(pos.symbol);
  const source = createDirectSource(pos, totalValue);

  if (existing) {
    existing.totalDirectValue += pos.currentValue;
    existing.totalGainLossDollar += pos.totalGainLossDollar;
    existing.costBasis += pos.costBasisTotal;
    existing.investmentTypes.add(pos.investmentType);
    existing.accounts.add(pos.accountName);
    existing.sources.push(source);
  } else {
    const quote = quotes[pos.symbol];
    rowMap.set(pos.symbol, {
      symbol: pos.symbol,
      name: quote?.longName || quote?.shortName || pos.description,
      totalDirectValue: pos.currentValue,
      totalGainLossDollar: pos.totalGainLossDollar,
      costBasis: pos.costBasisTotal,
      investmentTypes: new Set([pos.investmentType]),
      accounts: new Set([pos.accountName]),
      sources: [source],
    });
  }
}

// === Main entry point ===

export function computePortfolioData(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  holdings: Record<string, FundHolding[]>,
  layoutWidth: number,
  layoutHeight: number
): PortfolioData {
  const totalValue = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const totalGainLoss = positions.reduce((sum, p) => sum + p.totalGainLossDollar, 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasisTotal, 0);

  const treeMapNodes = buildTreeMap(positions, quotes, holdings, totalValue, layoutWidth, layoutHeight);
  const tableRows = buildHoldingsView(positions, quotes, holdings, totalValue);
  const positionRows = buildPositionsView(positions, quotes, totalValue);

  const summary: PortfolioSummary = {
    totalValue,
    totalGainLoss,
    totalGainLossPercent: percentOf(totalGainLoss, totalCostBasis),
    accounts: [...new Set(positions.map((p) => p.accountName))],
    investmentTypes: [...new Set(positions.map((p) => p.investmentType))],
  };

  return { treeMapNodes, tableRows, positionRows, summary, lastUpdated: new Date().toISOString() };
}

// === TreeMap building ===

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

function buildPositionMeta(
  pos: FidelityPosition,
  quote: QuoteData | undefined,
  totalValue: number
): TreeMapNodeMeta {
  return {
    percentOfPortfolio: percentOf(pos.currentValue, totalValue),
    currentPrice: quote?.regularMarketPrice ?? pos.lastPrice,
    totalGainLossDollar: pos.totalGainLossDollar,
    totalGainLossPercent: pos.totalGainLossPercent,
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
    investmentType: pos.investmentType,
    account: pos.accountName,
  };
}

function buildTreeMap(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  holdings: Record<string, FundHolding[]>,
  totalValue: number,
  width: number,
  height: number
): TreeMapNode[] {
  const children: HierarchyData[] = [];

  for (const pos of positions) {
    const quote = quotes[pos.symbol];
    const color = getColorForSymbol(pos.symbol);

    if (isFundInvestmentType(pos.investmentType)) {
      const fundHoldings = holdings[pos.symbol] || [];

      if (fundHoldings.length > 0) {
        children.push({
          name: pos.description,
          symbol: pos.symbol,
          color,
          meta: buildPositionMeta(pos, quote, totalValue),
          children: fundHoldings.map((h) => {
            const hQuote = quotes[h.symbol];
            const holdingValue = pos.currentValue * h.holdingPercent;
            return {
              name: h.holdingName,
              symbol: h.symbol,
              value: holdingValue,
              color: getColorForSymbol(h.symbol),
              meta: {
                parentSymbol: pos.symbol,
                parentName: pos.description,
                percentOfParent: h.holdingPercent * 100,
                percentOfPortfolio: percentOf(holdingValue, totalValue),
                currentPrice: hQuote?.regularMarketPrice,
                totalGainLossDollar: hQuote?.regularMarketChange,
                totalGainLossPercent: hQuote?.regularMarketChangePercent,
                fiftyTwoWeekHigh: hQuote?.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: hQuote?.fiftyTwoWeekLow,
                investmentType: pos.investmentType,
                account: pos.accountName,
              },
            };
          }),
        });
      } else {
        children.push({
          name: pos.description,
          symbol: pos.symbol,
          value: pos.currentValue,
          color,
          meta: buildPositionMeta(pos, quote, totalValue),
        });
      }
    } else if (pos.investmentType === "Cash") {
      if (pos.currentValue > 0) {
        children.push({
          name: pos.description || "Cash",
          symbol: pos.symbol,
          value: pos.currentValue,
          color: color ?? DEFAULT_TREEMAP_COLOR,
          meta: {
            percentOfPortfolio: percentOf(pos.currentValue, totalValue),
            investmentType: "Cash",
            account: pos.accountName,
          },
        });
      }
    } else {
      children.push({
        name: pos.description,
        symbol: pos.symbol,
        value: pos.currentValue,
        color,
        meta: buildPositionMeta(pos, quote, totalValue),
      });
    }
  }

  if (children.length === 0) return [];

  const root = hierarchy<HierarchyData>({ name: "Portfolio", symbol: "ROOT", children })
    .sum((d) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const laid = treemap<HierarchyData>()
    .size([width, height])
    .tile(treemapSquarify)
    .paddingOuter(4)
    .paddingTop((node) => (node.depth === 0 ? 0 : 20))
    .paddingInner(4)(root);

  const nodes: TreeMapNode[] = [];
  flattenNode(laid, nodes, { value: 0 });
  return nodes;
}

function flattenNode(
  node: HierarchyRectangularNode<HierarchyData>,
  result: TreeMapNode[],
  counter: { value: number }
): void {
  if (node.depth === 0) {
    counter.value = 0;
    for (const child of node.children ?? []) {
      flattenNode(child, result, counter);
    }
    return;
  }

  const d = node.data;
  const meta = d.meta || { percentOfPortfolio: 0 };
  counter.value++;

  result.push({
    id: `${d.symbol}-${node.depth}-${counter.value}`,
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

  for (const child of node.children ?? []) {
    flattenNode(child, result, counter);
  }
}

// === TABLE: Holdings view (aggregated by underlying symbol) ===

function buildHoldingsView(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  holdings: Record<string, FundHolding[]>,
  totalValue: number
): TableRow[] {
  const rowMap = new Map<string, RowAccumulator>();

  for (const pos of positions) {
    if ((holdings[pos.symbol]?.length ?? 0) > 0) continue;
    addDirectPositionToRow(rowMap, pos, quotes, totalValue);
  }

  for (const fund of positions.filter((p) => (holdings[p.symbol]?.length ?? 0) > 0)) {
    for (const h of holdings[fund.symbol] || []) {
      if (!h.symbol) continue;

      const holdingValue = fund.currentValue * h.holdingPercent;
      const source = createFundSource(fund, holdingValue, h.holdingPercent, totalValue);
      const existing = rowMap.get(h.symbol);

      if (existing) {
        existing.accounts.add(fund.accountName);
        existing.investmentTypes.add(fund.investmentType);
        existing.sources.push(source);
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
          sources: [source],
        });
      }
    }
  }

  return convertToTableRows(rowMap, quotes, positions, totalValue);
}

// === TABLE: Positions view (one row per portfolio position) ===

function buildPositionsView(
  positions: FidelityPosition[],
  quotes: Record<string, QuoteData>,
  totalValue: number
): TableRow[] {
  const rowMap = new Map<string, RowAccumulator>();

  for (const pos of positions) {
    addDirectPositionToRow(rowMap, pos, quotes, totalValue);
  }

  return convertToTableRows(rowMap, quotes, positions, totalValue);
}

// === Shared: convert rowMap to TableRow[] ===

function convertToTableRows(
  rowMap: Map<string, RowAccumulator>,
  quotes: Record<string, QuoteData>,
  positions: FidelityPosition[],
  totalValue: number
): TableRow[] {
  const rows: TableRow[] = [];

  for (const [, data] of rowMap) {
    const quote = quotes[data.symbol];
    const fundSliceValue = data.sources
      .filter((s) => s.type === "fund")
      .reduce((sum, s) => sum + s.value, 0);
    const combinedValue = data.totalDirectValue + fundSliceValue;

    rows.push({
      symbol: data.symbol,
      name: data.name,
      accounts: [...data.accounts],
      investmentTypes: [...data.investmentTypes],
      totalValue: combinedValue,
      percentOfPortfolio: percentOf(combinedValue, totalValue),
      currentPrice: quote?.regularMarketPrice ?? findLastPrice(positions, data.symbol),
      totalGainLossDollar: data.totalGainLossDollar,
      totalGainLossPercent: percentOf(data.totalGainLossDollar, data.costBasis),
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? 0,
      isExpandable: data.sources.length > 1,
      sources: data.sources,
    });
  }

  return rows;
}

function findLastPrice(positions: FidelityPosition[], symbol: string): number {
  return positions.find((p) => p.symbol === symbol)?.lastPrice || 0;
}
