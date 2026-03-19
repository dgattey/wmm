import { DEFAULT_SORT_CONFIG, isSortableTableKey } from "./tableSort";
import type {
  FilterState,
  SortConfig,
  TreeMapGrouping,
  ViewMode,
} from "./types";

const PARAM_Q = "q";
const PARAM_ACCOUNTS = "accounts";
const PARAM_TYPES = "types";
const PARAM_FUNDS = "funds";
const PARAM_SORT = "sort";
const PARAM_DIRECTION = "dir";
const PARAM_VIEW = "view";
const PARAM_GROUP = "group";

export const DEFAULT_FILTER_STATE: FilterState = {
  investmentTypes: [],
  accounts: [],
  searchQuery: "",
};
export const DEFAULT_VIEW_MODE: ViewMode = "holdings";
export const DEFAULT_TREE_MAP_GROUPING: TreeMapGrouping = "fund";

export interface PortfolioUrlState {
  filters: FilterState;
  selectedFunds: string[];
  sortConfig: SortConfig;
  viewMode: ViewMode;
  treeMapGrouping: TreeMapGrouping;
}

function normalizeStringArray(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right)
  );
}

function parseArray(value: string | null): string[] {
  if (!value || typeof value !== "string") return [];
  return normalizeStringArray(value.split(","));
}

function normalizeSearchQuery(searchQuery?: string): string {
  return searchQuery?.trim() ?? "";
}

function normalizeFilterState(filters: FilterState): FilterState {
  return {
    accounts: normalizeStringArray(filters.accounts),
    investmentTypes: normalizeStringArray(filters.investmentTypes),
    searchQuery: normalizeSearchQuery(filters.searchQuery),
  };
}

function normalizeSortConfig(sortConfig?: SortConfig): SortConfig {
  if (!sortConfig || !isSortableTableKey(sortConfig.key)) {
    return { ...DEFAULT_SORT_CONFIG };
  }

  return {
    key: sortConfig.key,
    direction: sortConfig.direction === "asc" ? "asc" : "desc",
  };
}

function normalizeViewMode(viewMode?: string | null): ViewMode {
  return viewMode === "positions" ? "positions" : DEFAULT_VIEW_MODE;
}

function normalizeTreeMapGrouping(treeMapGrouping?: string | null): TreeMapGrouping {
  return treeMapGrouping === "holding" ? "holding" : DEFAULT_TREE_MAP_GROUPING;
}

function normalizeSelectedFunds(selectedFunds: string[]): string[] {
  return normalizeStringArray(selectedFunds);
}

export function getDefaultPortfolioUrlState(): PortfolioUrlState {
  return {
    filters: { ...DEFAULT_FILTER_STATE },
    selectedFunds: [],
    sortConfig: { ...DEFAULT_SORT_CONFIG },
    viewMode: DEFAULT_VIEW_MODE,
    treeMapGrouping: DEFAULT_TREE_MAP_GROUPING,
  };
}

export function normalizePortfolioUrlState(
  state?: Partial<PortfolioUrlState>
): PortfolioUrlState {
  const defaults = getDefaultPortfolioUrlState();

  return {
    filters: normalizeFilterState(state?.filters ?? defaults.filters),
    selectedFunds: normalizeSelectedFunds(state?.selectedFunds ?? defaults.selectedFunds),
    sortConfig: normalizeSortConfig(state?.sortConfig ?? defaults.sortConfig),
    viewMode: normalizeViewMode(state?.viewMode),
    treeMapGrouping: normalizeTreeMapGrouping(state?.treeMapGrouping),
  };
}

export function parsePortfolioUrlState(params: URLSearchParams): PortfolioUrlState {
  const q = params.get(PARAM_Q)?.trim();
  return normalizePortfolioUrlState({
    filters: {
      investmentTypes: parseArray(params.get(PARAM_TYPES)),
      accounts: parseArray(params.get(PARAM_ACCOUNTS)),
      searchQuery: q ?? "",
    },
    selectedFunds: parseArray(params.get(PARAM_FUNDS)),
    sortConfig: {
      key: params.get(PARAM_SORT) ?? DEFAULT_SORT_CONFIG.key,
      direction: params.get(PARAM_DIRECTION) === "asc" ? "asc" : "desc",
    },
    viewMode: params.get(PARAM_VIEW),
    treeMapGrouping: params.get(PARAM_GROUP),
  });
}

export function buildPortfolioSearchParams(
  state: PortfolioUrlState,
  existingParams?: URLSearchParams
): string {
  const params = new URLSearchParams(existingParams?.toString() ?? "");
  const normalizedState = normalizePortfolioUrlState(state);
  const defaults = getDefaultPortfolioUrlState();

  [
    PARAM_Q,
    PARAM_ACCOUNTS,
    PARAM_TYPES,
    PARAM_FUNDS,
    PARAM_SORT,
    PARAM_DIRECTION,
    PARAM_VIEW,
    PARAM_GROUP,
  ].forEach((key) => params.delete(key));

  if (normalizedState.filters.searchQuery) {
    params.set(PARAM_Q, normalizedState.filters.searchQuery);
  }
  if (normalizedState.filters.accounts.length > 0) {
    params.set(PARAM_ACCOUNTS, normalizedState.filters.accounts.join(","));
  }
  if (normalizedState.filters.investmentTypes.length > 0) {
    params.set(PARAM_TYPES, normalizedState.filters.investmentTypes.join(","));
  }
  if (normalizedState.selectedFunds.length > 0) {
    params.set(PARAM_FUNDS, normalizedState.selectedFunds.join(","));
  }
  if (normalizedState.sortConfig.key !== defaults.sortConfig.key) {
    params.set(PARAM_SORT, normalizedState.sortConfig.key);
  }
  if (normalizedState.sortConfig.direction !== defaults.sortConfig.direction) {
    params.set(PARAM_DIRECTION, normalizedState.sortConfig.direction);
  }
  if (normalizedState.viewMode !== defaults.viewMode) {
    params.set(PARAM_VIEW, normalizedState.viewMode);
  }
  if (normalizedState.treeMapGrouping !== defaults.treeMapGrouping) {
    params.set(PARAM_GROUP, normalizedState.treeMapGrouping);
  }

  return params.toString();
}

export function arePortfolioUrlStatesEqual(
  left: PortfolioUrlState,
  right: PortfolioUrlState
): boolean {
  return buildPortfolioSearchParams(left) === buildPortfolioSearchParams(right);
}
