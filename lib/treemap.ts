import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { assignColors } from "./colors";
import type { FilterState, FundOption, TableRow, TreeMapNode } from "./types";

const FUND_TYPES = new Set(["ETFs", "Mutual Funds", "Others"]);

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

export function isFundInvestmentType(type?: string): boolean {
  return !!type && FUND_TYPES.has(type);
}

export function getFundOptions(nodes: TreeMapNode[]): FundOption[] {
  const parentSymbols = new Set(
    nodes
      .map((node) => node.parentSymbol)
      .filter((symbol): symbol is string => Boolean(symbol))
  );

  return nodes
    .filter((node) => node.depth === 1 && isFundInvestmentType(node.investmentType))
    .map((node) => ({
      symbol: node.symbol,
      name: node.name,
      color: node.color,
      value: node.value,
      hasChildren: parentSymbols.has(node.symbol),
    }))
    .sort((a, b) => b.value - a.value);
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
    let visibleValue = 0;
    const accounts = new Set<string>();
    const investmentTypes = new Set<string>();

    for (const source of row.sources) {
      if (!matchesSourceFilters(source.account, source.investmentType, filters)) {
        continue;
      }

      if (!matchesFundSelection(row.symbol, source.type, source.sourceSymbol, selectedFunds)) {
        continue;
      }

      visibleValue += source.value;
      accounts.add(source.account);
      investmentTypes.add(source.investmentType);
    }

    if (visibleValue <= 0) {
      continue;
    }

    const visibleInvestmentTypes = [...investmentTypes];
    const visibleAccounts = [...accounts];
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

  const colorMap = assignColors(
    visibleRows.map((row) => row.symbol).sort((a, b) => a.localeCompare(b))
  );

  const children: FlatHierarchyData[] = visibleRows.map((row) => ({
    ...row,
    color: colorMap[row.symbol]?.base ?? "#64748b",
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
    .paddingOuter(3)
    .paddingTop(3)
    .paddingInner(2)(root);

  return (laidOut.children ?? []).map((node, index) => ({
    id: `${node.data.symbol}-1-${index + 1}`,
    symbol: node.data.symbol,
    name: node.data.name,
    value: node.value || 0,
    color: node.data.color,
    percentOfPortfolio: node.data.percentOfPortfolio,
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

function matchesSourceFilters(
  account: string,
  investmentType: string,
  filters: FilterState
): boolean {
  const matchesAccount =
    filters.accounts.length === 0 || filters.accounts.includes(account);
  const matchesType =
    filters.investmentTypes.length === 0 ||
    filters.investmentTypes.includes(investmentType);

  return matchesAccount && matchesType;
}

function matchesFundSelection(
  rowSymbol: string,
  sourceType: "direct" | "fund",
  sourceSymbol: string,
  selectedFunds: string[]
): boolean {
  if (selectedFunds.length === 0) {
    return true;
  }

  if (selectedFunds.includes(sourceSymbol)) {
    return true;
  }

  return sourceType === "direct" && selectedFunds.includes(rowSymbol);
}
