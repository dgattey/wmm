import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FidelityPosition,
  PortfolioData,
  StoredPortfolioSummary,
} from "@/lib/types";
import { PortfolioDetailClient } from "../PortfolioDetailClient";

const {
  pushMock,
  replaceMock,
  searchParamsState,
  storedRecordState,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsState: {
    value:
      "tab=details&q=apple&accounts=Account%20B&types=Stocks&funds=FUND-B&sort=currentPrice&dir=asc&view=positions&group=holding",
  },
  storedRecordState: {
    summary: null as StoredPortfolioSummary | null,
    positions: null as FidelityPosition[] | null,
    portfolioData: null as PortfolioData | null,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => "/portfolio/portfolio-1",
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useStoredPortfolioRecord", () => ({
  useStoredPortfolioRecord: () => ({
    summary: storedRecordState.summary,
    positions: storedRecordState.positions,
    portfolioData: storedRecordState.portfolioData,
    isLoading: false,
    isRefreshing: false,
    error: null,
    restoredFromStorage: true,
    isMissing: false,
    refreshData: vi.fn(),
    refreshFromStorage: vi.fn(),
  }),
}));

vi.mock("@/lib/storage", () => ({
  updateStoredPortfolioName: vi.fn(),
}));

vi.mock("@/app/components/Dashboard", () => ({
  Dashboard: (props: {
    filters: { accounts: string[]; investmentTypes: string[]; searchQuery?: string };
    selectedFunds: string[];
    sortConfig: { key: string; direction: "asc" | "desc" };
    viewMode: "holdings" | "positions";
    treeMapGrouping: "fund" | "holding";
    onFiltersChange: (filters: {
      accounts: string[];
      investmentTypes: string[];
      searchQuery?: string;
    }) => void;
    onSort: (key: string) => void;
    onViewModeChange: (mode: "holdings" | "positions") => void;
    onTreeMapGroupingChange: (mode: "fund" | "holding") => void;
    onClearFunds: () => void;
  }) => (
    <div>
      <div data-testid="search-query">{props.filters.searchQuery ?? ""}</div>
      <div data-testid="accounts">{props.filters.accounts.join("|")}</div>
      <div data-testid="investment-types">{props.filters.investmentTypes.join("|")}</div>
      <div data-testid="selected-funds">{props.selectedFunds.join("|")}</div>
      <div data-testid="sort-config">
        {props.sortConfig.key}:{props.sortConfig.direction}
      </div>
      <div data-testid="view-mode">{props.viewMode}</div>
      <div data-testid="tree-map-grouping">{props.treeMapGrouping}</div>
      <button
        type="button"
        onClick={() =>
          props.onFiltersChange({
            accounts: ["Account B"],
            investmentTypes: ["Stocks"],
            searchQuery: "msft",
          })
        }
      >
        Update filters
      </button>
      <button type="button" onClick={() => props.onSort("totalValue")}>
        Sort by value
      </button>
      <button type="button" onClick={() => props.onViewModeChange("holdings")}>
        Use holdings view
      </button>
      <button type="button" onClick={() => props.onTreeMapGroupingChange("fund")}>
        Group by fund
      </button>
      <button type="button" onClick={props.onClearFunds}>
        Clear funds
      </button>
    </div>
  ),
}));

const positions: FidelityPosition[] = [
  {
    accountNumber: "1234",
    accountName: "Account B",
    investmentType: "Stocks",
    symbol: "FUND-B",
    description: "Fund B",
    quantity: 10,
    lastPrice: 100,
    lastPriceChange: 1,
    currentValue: 1000,
    todayGainLossDollar: 10,
    todayGainLossPercent: 1,
    totalGainLossDollar: 100,
    totalGainLossPercent: 11,
    percentOfAccount: 100,
    costBasisTotal: 900,
    averageCostBasis: 90,
    type: "Equity",
  },
];

const portfolioData: PortfolioData = {
  treeMapNodes: [],
  tableRows: [
    {
      symbol: "FUND-B",
      name: "Fund B",
      accounts: ["Account B"],
      investmentTypes: ["Stocks"],
      totalValue: 1000,
      percentOfPortfolio: 100,
      currentPrice: 100,
      totalGainLossDollar: 100,
      totalGainLossPercent: 11,
      fiftyTwoWeekHigh: 120,
      fiftyTwoWeekLow: 80,
      isExpandable: false,
      sources: [],
    },
  ],
  positionRows: [
    {
      symbol: "FUND-B",
      name: "Fund B",
      accounts: ["Account B"],
      investmentTypes: ["Stocks"],
      totalValue: 1000,
      percentOfPortfolio: 100,
      currentPrice: 100,
      totalGainLossDollar: 100,
      totalGainLossPercent: 11,
      fiftyTwoWeekHigh: 120,
      fiftyTwoWeekLow: 80,
      isExpandable: false,
      sources: [],
    },
  ],
  summary: {
    totalValue: 1000,
    totalGainLoss: 100,
    totalGainLossPercent: 11,
    accounts: ["Account B"],
    investmentTypes: ["Stocks"],
  },
  lastUpdated: "2026-03-19T00:00:00.000Z",
};

describe("PortfolioDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedRecordState.summary = {
      id: "portfolio-1",
      name: "My Portfolio",
      sourceFileName: "portfolio.csv",
      uploadedAt: "2026-03-19T00:00:00.000Z",
      lastViewedAt: "2026-03-19T00:00:00.000Z",
      positionCount: 1,
      totalValue: 1000,
    };
    storedRecordState.positions = positions;
    storedRecordState.portfolioData = portfolioData;
    searchParamsState.value =
      "tab=details&q=apple&accounts=Account%20B&types=Stocks&funds=FUND-B&sort=currentPrice&dir=asc&view=positions&group=holding";
  });

  it("hydrates the dashboard state from query params", () => {
    render(<PortfolioDetailClient portfolioId="portfolio-1" />);

    expect(screen.getByTestId("search-query")).toHaveTextContent("apple");
    expect(screen.getByTestId("accounts")).toHaveTextContent("Account B");
    expect(screen.getByTestId("investment-types")).toHaveTextContent("Stocks");
    expect(screen.getByTestId("selected-funds")).toHaveTextContent("FUND-B");
    expect(screen.getByTestId("sort-config")).toHaveTextContent("currentPrice:asc");
    expect(screen.getByTestId("view-mode")).toHaveTextContent("positions");
    expect(screen.getByTestId("tree-map-grouping")).toHaveTextContent("holding");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("writes filter and view updates back into the URL without touching unrelated params", async () => {
    render(<PortfolioDetailClient portfolioId="portfolio-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Update filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort by value" }));
    fireEvent.click(screen.getByRole("button", { name: "Use holdings view" }));
    fireEvent.click(screen.getByRole("button", { name: "Group by fund" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear funds" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const lastUrl = replaceMock.mock.calls.at(-1)?.[0];
    const nextParams = new URL(String(lastUrl), "http://localhost").searchParams;

    expect(nextParams.get("tab")).toBe("details");
    expect(nextParams.get("q")).toBe("msft");
    expect(nextParams.get("accounts")).toBe("Account B");
    expect(nextParams.get("types")).toBe("Stocks");
    expect(nextParams.get("funds")).toBeNull();
    expect(nextParams.get("sort")).toBeNull();
    expect(nextParams.get("dir")).toBeNull();
    expect(nextParams.get("view")).toBeNull();
    expect(nextParams.get("group")).toBeNull();
  });

  it("responds to external query string changes", async () => {
    const { rerender } = render(<PortfolioDetailClient portfolioId="portfolio-1" />);

    searchParamsState.value = "tab=details&q=tsla&dir=asc";
    rerender(<PortfolioDetailClient portfolioId="portfolio-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("search-query")).toHaveTextContent("tsla");
    });

    expect(screen.getByTestId("accounts")).toHaveTextContent("");
    expect(screen.getByTestId("investment-types")).toHaveTextContent("");
    expect(screen.getByTestId("selected-funds")).toHaveTextContent("");
    expect(screen.getByTestId("sort-config")).toHaveTextContent("totalValue:asc");
    expect(screen.getByTestId("view-mode")).toHaveTextContent("holdings");
    expect(screen.getByTestId("tree-map-grouping")).toHaveTextContent("fund");
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
