import type {
  FidelityPosition,
  FilterState,
  PositionSource,
  TableRow,
  TreeMapNode,
} from "./types";

interface RowSourceSelection {
  rowSymbol: string;
  sourceType: PositionSource["type"];
  sourceSymbol: string;
}

export function hasActivePortfolioFilters(
  filters: FilterState,
  selectedFunds: string[]
): boolean {
  return (
    filters.investmentTypes.length > 0 ||
    filters.accounts.length > 0 ||
    hasSearchQuery(filters) ||
    selectedFunds.length > 0
  );
}

export function hasSearchQuery(filters: FilterState): boolean {
  return normalizeSearchQuery(filters.searchQuery).length > 0;
}

export function matchesSourceFilters(
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

export function matchesPositionFilters(
  position: FidelityPosition,
  filters: FilterState
): boolean {
  return matchesSourceFilters(
    position.accountName,
    position.investmentType,
    filters
  );
}

export function matchesPositionFundSelection(
  position: FidelityPosition,
  selectedFunds: string[]
): boolean {
  return (
    selectedFunds.length === 0 || selectedFunds.includes(position.symbol)
  );
}

export function matchesRowSourceFundSelection(
  { rowSymbol, sourceType, sourceSymbol }: RowSourceSelection,
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

export function matchesTreeMapNodeFilters(
  node: TreeMapNode,
  filters: FilterState
): boolean {
  const matchesAccount =
    filters.accounts.length === 0 ||
    (node.account ? filters.accounts.includes(node.account) : false);
  const matchesType =
    filters.investmentTypes.length === 0 ||
    (node.investmentType
      ? filters.investmentTypes.includes(node.investmentType)
      : false);

  return matchesAccount && matchesType;
}

export function matchesPositionSearch(
  position: Pick<FidelityPosition, "symbol" | "description">,
  searchQuery?: string
): boolean {
  return matchesSearchQuery([position.symbol, position.description], searchQuery);
}

export function matchesTableRowSearch(
  row: Pick<TableRow, "symbol" | "name" | "sources">,
  searchQuery?: string
): boolean {
  return (
    matchesSearchQuery([row.symbol, row.name], searchQuery) ||
    row.sources.some((source) => matchesFundSourceSearch(source, searchQuery))
  );
}

export function matchesFundSourceSearch(
  source: Pick<PositionSource, "type" | "sourceSymbol" | "sourceName">,
  searchQuery?: string
): boolean {
  if (source.type !== "fund") {
    return false;
  }

  return matchesSearchQuery([source.sourceSymbol, source.sourceName], searchQuery);
}

export function matchesTreeMapNodeSearch(
  node: Pick<TreeMapNode, "symbol" | "name">,
  searchQuery?: string
): boolean {
  return matchesSearchQuery([node.symbol, node.name], searchQuery);
}

export function normalizeSearchQuery(searchQuery?: string): string {
  return (searchQuery ?? "").trim().toLowerCase();
}

function matchesSearchQuery(
  values: Array<string | undefined>,
  searchQuery?: string
): boolean {
  const terms = normalizeSearchQuery(searchQuery)
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) {
    return true;
  }

  const haystack = values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}
