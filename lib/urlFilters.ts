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
/** Table row mode: holdings vs positions (matches toolbar TABLE labels). */
const PARAM_TABLE = "table";
/** Treemap grouping: fund vs aggregated (matches toolbar Chart labels). */
const PARAM_CHART = "chart";

/** Legacy keys — still read when building state from old links; never written. */
const LEGACY_PARAM_VIEW = "view";
const LEGACY_PARAM_GROUP = "group";

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

/**
 * Lists use `|` so values can contain commas (e.g. "Mutual Funds") without
 * ugly encodings. Comma-separated lists are still accepted for old URLs.
 */
function parseDelimitedList(value: string | null): string[] {
  if (!value || typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (trimmed.includes("|")) {
    return normalizeStringArray(trimmed.split("|"));
  }

  return normalizeStringArray(trimmed.split(","));
}

function joinDelimitedList(values: string[]): string {
  return normalizeStringArray(values).join("|");
}

function normalizeFilterState(filters: FilterState): FilterState {
  return {
    accounts: normalizeStringArray(filters.accounts),
    investmentTypes: normalizeStringArray(filters.investmentTypes),
    searchQuery: filters.searchQuery?.trim() ?? "",
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

function normalizeTableViewMode(raw?: string | null): ViewMode {
  const v = raw?.toLowerCase().trim() ?? "";
  if (v === "positions") {
    return "positions";
  }

  return DEFAULT_VIEW_MODE;
}

/** URL chart=aggregated ↔ internal "holding"; chart=fund ↔ "fund". */
function normalizeChartGrouping(raw?: string | null): TreeMapGrouping {
  const v = raw?.toLowerCase().trim() ?? "";
  if (v === "aggregated" || v === "holding") {
    return "holding";
  }

  if (v === "fund" || v === "by-fund" || v === "byfund") {
    return "fund";
  }

  return DEFAULT_TREE_MAP_GROUPING;
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
    viewMode: state?.viewMode ?? defaults.viewMode,
    treeMapGrouping: state?.treeMapGrouping ?? defaults.treeMapGrouping,
  };
}

export function parsePortfolioUrlState(params: URLSearchParams): PortfolioUrlState {
  const q = params.get(PARAM_Q)?.trim();
  const tableRaw = params.get(PARAM_TABLE) ?? params.get(LEGACY_PARAM_VIEW);
  const chartRaw = params.get(PARAM_CHART) ?? params.get(LEGACY_PARAM_GROUP);

  return normalizePortfolioUrlState({
    filters: {
      investmentTypes: parseDelimitedList(params.get(PARAM_TYPES)),
      accounts: parseDelimitedList(params.get(PARAM_ACCOUNTS)),
      searchQuery: q ?? "",
    },
    selectedFunds: parseDelimitedList(params.get(PARAM_FUNDS)),
    sortConfig: {
      key: params.get(PARAM_SORT) ?? DEFAULT_SORT_CONFIG.key,
      direction: params.get(PARAM_DIRECTION) === "asc" ? "asc" : "desc",
    },
    viewMode: normalizeTableViewMode(tableRaw),
    treeMapGrouping: normalizeChartGrouping(chartRaw),
  });
}

const PORTFOLIO_QUERY_KEYS = [
  PARAM_Q,
  PARAM_ACCOUNTS,
  PARAM_TYPES,
  PARAM_FUNDS,
  PARAM_SORT,
  PARAM_DIRECTION,
  PARAM_TABLE,
  PARAM_CHART,
  LEGACY_PARAM_VIEW,
  LEGACY_PARAM_GROUP,
] as const;

export function buildPortfolioSearchParams(
  state: PortfolioUrlState,
  existingParams?: URLSearchParams
): string {
  const params = new URLSearchParams(existingParams?.toString() ?? "");
  const normalizedState = normalizePortfolioUrlState(state);
  const defaults = getDefaultPortfolioUrlState();

  PORTFOLIO_QUERY_KEYS.forEach((key) => params.delete(key));

  if (normalizedState.filters.searchQuery) {
    params.set(PARAM_Q, normalizedState.filters.searchQuery);
  }
  if (normalizedState.filters.accounts.length > 0) {
    params.set(PARAM_ACCOUNTS, joinDelimitedList(normalizedState.filters.accounts));
  }
  if (normalizedState.filters.investmentTypes.length > 0) {
    params.set(PARAM_TYPES, joinDelimitedList(normalizedState.filters.investmentTypes));
  }
  if (normalizedState.selectedFunds.length > 0) {
    params.set(PARAM_FUNDS, joinDelimitedList(normalizedState.selectedFunds));
  }
  if (normalizedState.sortConfig.key !== defaults.sortConfig.key) {
    params.set(PARAM_SORT, normalizedState.sortConfig.key);
  }
  if (normalizedState.sortConfig.direction !== defaults.sortConfig.direction) {
    params.set(PARAM_DIRECTION, normalizedState.sortConfig.direction);
  }
  if (normalizedState.viewMode !== defaults.viewMode) {
    params.set(PARAM_TABLE, normalizedState.viewMode);
  }
  if (normalizedState.treeMapGrouping !== defaults.treeMapGrouping) {
    params.set(
      PARAM_CHART,
      normalizedState.treeMapGrouping === "holding" ? "aggregated" : "fund"
    );
  }

  return params.toString();
}

export function arePortfolioUrlStatesEqual(
  left: PortfolioUrlState,
  right: PortfolioUrlState
): boolean {
  return buildPortfolioSearchParams(left) === buildPortfolioSearchParams(right);
}
