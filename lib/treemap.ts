import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { getColorForSymbol } from "./colors";
import { isFundInvestmentType } from "./investmentTypes";
import {
  matchesRowSourceFundSelection,
  matchesSourceFilters,
  matchesTableRowSearch,
} from "./portfolioFilters";
import type { FilterState, FundOption, TableRow, TreeMapNode } from "./types";

interface FlatNodeData {
  symbol: string;
  name: string;
  value: number;
  color: string;
  percentOfPortfolio: number;
  currentPrice?: number;
  totalGainLossDollar?: number;
  totalGainLossPercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  investmentType?: string;
  account?: string;
}

interface FlatHierarchyData extends Partial<FlatNodeData> {
  children?: FlatHierarchyData[];
}

interface RelayoutHierarchyData {
  node: TreeMapNode;
  children?: RelayoutHierarchyData[];
}

export function getFundOptions(nodes: TreeMapNode[]): FundOption[] {
  const parentSymbols = new Set(
    nodes
      .map((node) => node.parentSymbol)
      .filter((symbol): symbol is string => Boolean(symbol))
  );
  const options = new Map<string, FundOption>();

  for (const node of nodes) {
    if (node.depth !== 1 || !isFundInvestmentType(node.investmentType)) {
      continue;
    }

    const existing = options.get(node.symbol);
    if (existing) {
      existing.value += node.value;
      existing.hasChildren = existing.hasChildren || parentSymbols.has(node.symbol);
      continue;
    }

    options.set(node.symbol, {
      symbol: node.symbol,
      name: node.name,
      color: node.color,
      value: node.value,
      hasChildren: parentSymbols.has(node.symbol),
    });
  }

  return [...options.values()].sort((a, b) => b.value - a.value);
}

export function filterFundTreeMapNodes(
  nodes: TreeMapNode[],
  selectedFunds: string[]
): TreeMapNode[] {
  if (selectedFunds.length === 0) return nodes;

  return nodes.filter((node) => {
    if (node.depth === 1) {
      return selectedFunds.includes(node.symbol);
    }

    if (node.depth === 2 && node.parentSymbol) {
      return selectedFunds.includes(node.parentSymbol);
    }

    return false;
  });
}

export function filterAndRelayoutFundTreeMapNodes(
  nodes: TreeMapNode[],
  selectedFunds: string[],
  width: number,
  height: number
): TreeMapNode[] {
  const filteredNodes = filterFundTreeMapNodes(nodes, selectedFunds);

  if (selectedFunds.length === 0 || filteredNodes.length === 0) {
    return filteredNodes;
  }

  return relayoutTreeMapNodes(filteredNodes, width, height);
}

export function relayoutTreeMapNodes(
  nodes: TreeMapNode[],
  width: number,
  height: number
): TreeMapNode[] {
  const visibleNodes = nodes.filter((node) => node.value > 0);
  if (visibleNodes.length === 0) {
    return [];
  }

  const parentNodes = visibleNodes.filter((node) => node.depth === 1);
  const totalValue = parentNodes.reduce((sum, node) => sum + node.value, 0);
  const childGroups = new Map<string, TreeMapNode[]>();

  for (const node of visibleNodes) {
    if (node.depth !== 2 || !node.parentSymbol) {
      continue;
    }

    const groupKey = getTreeMapGroupKey(node.parentSymbol, node.account);
    const existing = childGroups.get(groupKey);
    if (existing) {
      existing.push(node);
    } else {
      childGroups.set(groupKey, [node]);
    }
  }

  const root = hierarchy<RelayoutHierarchyData>({
    node: {
      id: "ROOT",
      symbol: "ROOT",
      name: "Portfolio",
      value: totalValue,
      color: "transparent",
      percentOfPortfolio: 100,
      x0: 0,
      y0: 0,
      x1: width,
      y1: height,
      depth: 0,
    },
    children: parentNodes.map((node) => ({
      node,
      children: (childGroups.get(getTreeMapGroupKey(node.symbol, node.account)) ?? []).map(
        (child) => ({
          node: child,
        })
      ),
    })),
  })
    .sum((entry) =>
      entry.children && entry.children.length > 0 ? 0 : entry.node.value
    )
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const laidOut = treemap<RelayoutHierarchyData>()
    .size([width, height])
    .tile(treemapSquarify)
    .paddingOuter(4)
    .paddingTop((node) =>
      node.depth === 0 ? 0 : node.children && node.children.length > 0 ? 20 : 0
    )
    .paddingInner(4)(root);

  return laidOut
    .descendants()
    .filter((node) => node.depth > 0)
    .map((node) => {
      const source = node.data.node;
      const nodeValue = node.value || 0;
      const parentValue = node.parent?.value || 0;

      return {
        ...source,
        value: nodeValue,
        percentOfPortfolio: totalValue > 0 ? (nodeValue / totalValue) * 100 : 0,
        percentOfParent:
          node.depth === 2
            ? parentValue > 0
              ? (nodeValue / parentValue) * 100
              : 0
            : source.percentOfParent,
        x0: node.x0,
        y0: node.y0,
        x1: node.x1,
        y1: node.y1,
        depth: node.depth,
      };
    });
}

export function buildFlatHoldingTreeMapNodes({
  rows,
  filters,
  selectedFunds,
  totalPortfolioValue,
  width,
  height,
}: {
  rows: TableRow[];
  filters: FilterState;
  selectedFunds: string[];
  totalPortfolioValue: number;
  width: number;
  height: number;
}): TreeMapNode[] {
  const visibleRows: Omit<FlatNodeData, "color">[] = [];

  for (const row of rows) {
    const visibleSources = row.sources.filter(
      (source) =>
        matchesSourceFilters(source.account, source.investmentType, filters) &&
        matchesRowSourceFundSelection(
          {
            rowSymbol: row.symbol,
            sourceType: source.type,
            sourceSymbol: source.sourceSymbol,
          },
          selectedFunds
        )
    );

    if (
      visibleSources.length === 0 ||
      !matchesTableRowSearch(
        {
          symbol: row.symbol,
          name: row.name,
          sources: visibleSources,
        },
        filters.searchQuery
      )
    ) {
      continue;
    }

    const visibleValue = visibleSources.reduce(
      (sum, source) => sum + source.value,
      0
    );
    const visibleInvestmentTypes = [
      ...new Set(visibleSources.map((source) => source.investmentType)),
    ];
    const visibleAccounts = [
      ...new Set(visibleSources.map((source) => source.account)),
    ];
    const hasOnlyDirectSources = row.sources.every((source) => source.type === "direct");

    visibleRows.push({
      symbol: row.symbol,
      name: row.name,
      value: visibleValue,
      currentPrice: row.currentPrice,
      totalGainLossDollar: hasOnlyDirectSources ? row.totalGainLossDollar : undefined,
      totalGainLossPercent: hasOnlyDirectSources ? row.totalGainLossPercent : undefined,
      fiftyTwoWeekHigh: row.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: row.fiftyTwoWeekLow,
      percentOfPortfolio:
        totalPortfolioValue > 0 ? (visibleValue / totalPortfolioValue) * 100 : 0,
      investmentType:
        visibleInvestmentTypes.length === 1
          ? visibleInvestmentTypes[0]
          : visibleInvestmentTypes.length > 1
            ? "Mixed"
            : undefined,
      account: visibleAccounts.length === 1 ? visibleAccounts[0] : undefined,
    });
  }

  if (visibleRows.length === 0) {
    return [];
  }

  const children: FlatHierarchyData[] = visibleRows.map((row) => ({
    ...row,
    color: getColorForSymbol(row.symbol),
  }));

  const root = hierarchy<FlatHierarchyData>({
    symbol: "ROOT",
    name: "Portfolio",
    color: "transparent",
    value: 0,
    children,
  })
    .sum((node) => node.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const laidOut = treemap<FlatHierarchyData>()
    .size([width, height])
    .tile(treemapSquarify)
    .paddingOuter(4)
    .paddingTop(4)
    .paddingInner(4)(root);

  return (laidOut.children ?? []).map((node, index) => ({
    id: `${node.data.symbol!}-1-${index + 1}`,
    symbol: node.data.symbol!,
    name: node.data.name!,
    value: node.value || 0,
    color: node.data.color!,
    percentOfPortfolio: node.data.percentOfPortfolio ?? 0,
    x0: node.x0,
    y0: node.y0,
    x1: node.x1,
    y1: node.y1,
    depth: node.depth,
    currentPrice: node.data.currentPrice,
    totalGainLossDollar: node.data.totalGainLossDollar,
    totalGainLossPercent: node.data.totalGainLossPercent,
    fiftyTwoWeekHigh: node.data.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: node.data.fiftyTwoWeekLow,
    investmentType: node.data.investmentType,
    account: node.data.account,
  }));
}

function getTreeMapGroupKey(symbol: string, account?: string): string {
  return `${symbol}::${account ?? ""}`;
}
