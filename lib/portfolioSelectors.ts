import {
  PORTFOLIO_TREEMAP_HEIGHT,
  PORTFOLIO_TREEMAP_WIDTH,
} from "./portfolioLayout";
import {
  hasActivePortfolioFilters,
  hasSearchQuery,
  matchesPositionFilters,
  matchesPositionFundSelection,
  matchesPositionSearch,
  matchesRowSourceFundSelection,
  matchesSourceFilters,
  matchesTableRowSearch,
  matchesTreeMapNodeFilters,
  matchesTreeMapNodeSearch,
  normalizeSearchQuery,
} from "./portfolioFilters";
import { sortTableRows } from "./tableSort";
import { getTreeMapGroupKey, relayoutTreeMapNodes } from "./treemap";
import type {
  ActivePortfolioSummary,
  FidelityPosition,
  FilterState,
  PortfolioData,
  SortConfig,
  TableRow,
  TreeMapNode,
} from "./types";

/**
 * @param holdingsRows Pass aggregated holdings rows when filtering position rows,
 *   so search for an underlying name (e.g. "meta") also surfaces the funds that hold it.
 *   Omit for the aggregated (holdings) table itself.
 */
export function getFilteredRows(
  rows: TableRow[] | null,
  filters: FilterState,
  sortConfig: SortConfig,
  selectedFunds: string[],
  holdingsRows?: TableRow[]
): TableRow[] {
  if (!rows) {
    return [];
  }

  const searchAllowlist =
    holdingsRows && hasSearchQuery(filters)
      ? buildSearchAllowlist(holdingsRows, filters, selectedFunds)
      : null;

  const filtered = rows
    .map((row) =>
      buildVisibleRow(row, filters, selectedFunds, searchAllowlist)
    )
    .filter((row): row is TableRow => row !== null);
  const visibleTotalValue = filtered.reduce(
    (sum, row) => sum + row.totalValue,
    0
  );

  return sortTableRows(
    filtered.map((row) => ({
      ...row,
      percentOfPortfolio:
        visibleTotalValue > 0 ? (row.totalValue / visibleTotalValue) * 100 : 0,
      sources: row.sources.map((source) => ({
        ...source,
        percentOfPortfolio:
          visibleTotalValue > 0 ? (source.value / visibleTotalValue) * 100 : 0,
      })),
    })),
    sortConfig
  );
}

export function getActivePortfolioSummary(
  positions: FidelityPosition[] | null,
  filters: FilterState,
  selectedFunds: string[]
): ActivePortfolioSummary | null {
  if (!positions || !hasActivePortfolioFilters(filters, selectedFunds)) {
    return null;
  }

  const matchedPositions = positions.filter(
    (position) =>
      matchesPositionFilters(position, filters) &&
      matchesPositionFundSelection(position, selectedFunds) &&
      matchesPositionSearch(position, filters.searchQuery)
  );

  const value = matchedPositions.reduce(
    (sum, position) => sum + position.currentValue,
    0
  );
  const gainLoss = matchedPositions.reduce(
    (sum, position) => sum + position.totalGainLossDollar,
    0
  );
  const costBasis = matchedPositions.reduce(
    (sum, position) => sum + position.costBasisTotal,
    0
  );

  return {
    value,
    gainLoss,
    gainLossPercent: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
    label: getActiveSummaryLabel(matchedPositions, filters, selectedFunds),
  };
}

export function getFilteredTreeMapNodes(
  portfolioData: PortfolioData | null,
  filters: FilterState,
  width: number = PORTFOLIO_TREEMAP_WIDTH,
  height: number = PORTFOLIO_TREEMAP_HEIGHT
): TreeMapNode[] {
  if (!portfolioData) {
    return [];
  }

  const hasAttributeFilters =
    filters.investmentTypes.length > 0 || filters.accounts.length > 0;
  const searchActive = hasSearchQuery(filters);

  if (!hasAttributeFilters && !searchActive) {
    return portfolioData.treeMapNodes;
  }

  const visibleNodes = filterTreeMapNodesBySearch(
    portfolioData.treeMapNodes.filter((node) =>
      matchesTreeMapNodeFilters(node, filters)
    ),
    filters.searchQuery
  );

  return relayoutTreeMapNodes(
    visibleNodes,
    width,
    height
  );
}

function getActiveSummaryLabel(
  matchedPositions: FidelityPosition[],
  filters: FilterState,
  selectedFunds: string[]
): string {
  const hasAccountFilter = filters.accounts.length > 0;
  const hasTypeFilter = filters.investmentTypes.length > 0;
  const hasFundFilter = selectedFunds.length > 0;
  const searchActive = hasSearchQuery(filters);
  const searchLabel = filters.searchQuery?.trim();
  const activeFilterCount =
    filters.accounts.length +
    filters.investmentTypes.length +
    selectedFunds.length +
    (searchActive ? 1 : 0);

  if (searchActive && !hasAccountFilter && !hasTypeFilter && !hasFundFilter) {
    return searchLabel ? `Search: ${searchLabel}` : "Filtered portfolio";
  }

  if (!hasAccountFilter && !hasTypeFilter && hasFundFilter && !searchActive) {
    if (selectedFunds.length === 1) {
      return (
        matchedPositions.find((position) => position.symbol === selectedFunds[0])
          ?.description ?? selectedFunds[0]
      );
    }

    return `${selectedFunds.length} funds selected`;
  }

  if (hasAccountFilter && !hasTypeFilter && !hasFundFilter && !searchActive) {
    return filters.accounts[0];
  }

  if (!hasAccountFilter && hasTypeFilter && !hasFundFilter && !searchActive) {
    return filters.investmentTypes.length === 1
      ? filters.investmentTypes[0]
      : `${filters.investmentTypes.length} types selected`;
  }

  return `${activeFilterCount} ${
    activeFilterCount === 1 ? "filter" : "filters"
  } applied`;
}

/**
 * Build a set of symbols (underlying + contributing fund tickers) that match
 * the current search on aggregated holdings rows. Used so searching "meta"
 * on the positions table also surfaces VTI/SPY — any fund that holds META.
 */
function buildSearchAllowlist(
  holdingsRows: TableRow[],
  filters: FilterState,
  selectedFunds: string[]
): Set<string> {
  const symbols = new Set<string>();
  for (const row of holdingsRows) {
    const sources = filterVisibleSources(row, filters, selectedFunds);
    if (
      sources.length === 0 ||
      !matchesTableRowSearch(
        { symbol: row.symbol, name: row.name, sources },
        filters.searchQuery
      )
    ) {
      continue;
    }
    symbols.add(row.symbol);
    for (const s of sources) {
      if (s.type === "fund") {
        symbols.add(s.sourceSymbol);
      }
    }
  }
  return symbols;
}

function filterVisibleSources(
  row: TableRow,
  filters: FilterState,
  selectedFunds: string[]
) {
  return row.sources.filter(
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
}

function matchesSearch(
  row: TableRow,
  searchQuery: string | undefined,
  allowlist: ReadonlySet<string> | null
): boolean {
  if (!normalizeSearchQuery(searchQuery)) {
    return true;
  }
  if (
    matchesTableRowSearch(
      { symbol: row.symbol, name: row.name, sources: row.sources },
      searchQuery
    )
  ) {
    return true;
  }
  return allowlist !== null && allowlist.has(row.symbol);
}

function buildVisibleRow(
  row: TableRow,
  filters: FilterState,
  selectedFunds: string[],
  searchAllowlist: ReadonlySet<string> | null
): TableRow | null {
  const visibleSources = filterVisibleSources(row, filters, selectedFunds);

  if (visibleSources.length === 0) {
    return null;
  }

  const rowWithVisibleSources = { ...row, sources: visibleSources };
  if (!matchesSearch(rowWithVisibleSources, filters.searchQuery, searchAllowlist)) {
    return null;
  }

  const totalValue = visibleSources.reduce((sum, source) => sum + source.value, 0);
  const totalGainLossDollar = visibleSources.reduce(
    (sum, source) => sum + (source.totalGainLossDollar ?? 0),
    0
  );
  const totalCostBasis = visibleSources.reduce(
    (sum, source) => sum + (source.costBasisTotal ?? 0),
    0
  );

  return {
    ...row,
    accounts: [...new Set(visibleSources.map((source) => source.account))],
    investmentTypes: [
      ...new Set(visibleSources.map((source) => source.investmentType)),
    ],
    totalValue,
    percentOfPortfolio: 0,
    totalGainLossDollar,
    totalGainLossPercent:
      totalCostBasis > 0 ? (totalGainLossDollar / totalCostBasis) * 100 : 0,
    isExpandable: visibleSources.length > 1,
    sources: visibleSources,
  };
}

function filterTreeMapNodesBySearch(
  nodes: TreeMapNode[],
  searchQuery?: string
): TreeMapNode[] {
  if (!searchQuery?.trim()) {
    return nodes;
  }

  const childrenByParentKey = new Map<string, TreeMapNode[]>();
  for (const node of nodes) {
    if (node.depth !== 2 || !node.parentSymbol) {
      continue;
    }

    const key = getTreeMapGroupKey(node.parentSymbol, node.account);
    const siblings = childrenByParentKey.get(key);
    if (siblings) {
      siblings.push(node);
    } else {
      childrenByParentKey.set(key, [node]);
    }
  }

  const visibleNodeIds = new Set<string>();
  for (const node of nodes) {
    if (node.depth !== 1) {
      continue;
    }

    const childNodes =
      childrenByParentKey.get(getTreeMapGroupKey(node.symbol, node.account)) ?? [];
    const parentMatches = matchesTreeMapNodeSearch(node, searchQuery);
    const visibleChildren = parentMatches
      ? childNodes
      : childNodes.filter((childNode) =>
          matchesTreeMapNodeSearch(childNode, searchQuery)
        );

    if (parentMatches || visibleChildren.length > 0) {
      visibleNodeIds.add(node.id);
      visibleChildren.forEach((childNode) => visibleNodeIds.add(childNode.id));
    }
  }

  return nodes.filter((node) => visibleNodeIds.has(node.id));
}

