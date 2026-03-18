// === CSV Data (from Fidelity export parser) ===

export interface FidelityPosition {
  accountNumber: string;
  accountName: string;
  investmentType: InvestmentType;
  symbol: string;
  description: string;
  quantity: number;
  lastPrice: number;
  lastPriceChange: number;
  currentValue: number;
  todayGainLossDollar: number;
  todayGainLossPercent: number;
  totalGainLossDollar: number;
  totalGainLossPercent: number;
  percentOfAccount: number;
  costBasisTotal: number;
  averageCostBasis: number;
  type: string;
}

export type InvestmentType =
  | "Stocks"
  | "ETFs"
  | "Mutual Funds"
  | "Cash"
  | "Others";

// === Server Response: Full Dashboard Data ===

export interface PortfolioData {
  treeMapNodes: TreeMapNode[]; // grouped-by-fund treemap nodes
  tableRows: TableRow[]; // "holdings" view: aggregated by underlying symbol
  positionRows: TableRow[]; // "positions" view: one row per portfolio position/fund
  summary: PortfolioSummary;
  lastUpdated: string; // ISO timestamp
}

export type ViewMode = "holdings" | "positions";
export type TreeMapGrouping = "fund" | "holding";

export interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  accounts: string[];
  investmentTypes: string[];
}

export interface ActivePortfolioSummary {
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  label: string;
}

// === TreeMap Node (pre-computed with layout positions by server) ===

export interface TreeMapNode {
  id: string;
  symbol: string;
  name: string;
  value: number; // dollar amount
  color: string; // hex color, assigned by server
  parentSymbol?: string; // fund symbol if child of a fund
  parentName?: string;
  percentOfParent?: number;
  percentOfPortfolio: number;
  // Layout positions (computed server-side via d3-hierarchy)
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  depth: number; // 0=root, 1=fund/stock group, 2=holding-within-fund
  // Detail fields for tooltip
  currentPrice?: number;
  totalGainLossDollar?: number;
  totalGainLossPercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  investmentType?: string;
  account?: string;
}

export interface FundOption {
  symbol: string;
  name: string;
  color: string;
  value: number;
  hasChildren: boolean;
}

// === Table Row (pre-computed by server) ===

export interface TableRow {
  symbol: string;
  name: string;
  accounts: string[];
  investmentTypes: string[];
  totalValue: number;
  percentOfPortfolio: number;
  currentPrice: number;
  totalGainLossDollar: number;
  totalGainLossPercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  isExpandable: boolean;
  sources: PositionSource[];
}

export interface PositionSource {
  type: "direct" | "fund";
  sourceSymbol: string; // e.g. "VTI" or "DIRECT"
  sourceName: string;
  value: number;
  percentOfSource: number;
  percentOfPortfolio: number;
  account: string;
  investmentType: string;
  totalGainLossDollar?: number;
  costBasisTotal?: number;
}

// === UI State (client-only) ===

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export interface FilterState {
  investmentTypes: string[]; // empty = show all
  accounts: string[]; // empty = show all
  searchQuery?: string; // empty = show all
}

// === Server-internal types ===

export interface QuoteData {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  shortName: string;
  longName: string;
}

export interface FundHolding {
  symbol: string;
  holdingName: string;
  holdingPercent: number;
}
