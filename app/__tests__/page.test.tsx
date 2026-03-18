import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolio: vi.fn(),
}));

vi.mock("../components/UploadView", () => ({
  UploadView: (props: { isLoading?: boolean; error?: string | null }) => (
    <div data-testid="upload-view">
      {props.isLoading && <span>Loading</span>}
      {props.error && <span>{props.error}</span>}
      Upload View
    </div>
  ),
}));

vi.mock("../components/Dashboard", () => ({
  Dashboard: (props: {
    enableIntroAnimation?: boolean;
    enableValueAnimations?: boolean;
    fetchError?: string | null;
  }) => (
    <div
      data-testid="dashboard"
      data-intro-animation={props.enableIntroAnimation ? "true" : "false"}
      data-value-animations={props.enableValueAnimations ? "true" : "false"}
    >
      {props.fetchError && <span>{props.fetchError}</span>}
      Dashboard
    </div>
  ),
}));

import Home from "../page";
import { usePortfolio, type UsePortfolioResult } from "@/hooks/usePortfolio";

const mockUsePortfolio = vi.mocked(usePortfolio);

function makePortfolioReturn(
  overrides: Partial<UsePortfolioResult> = {}
): UsePortfolioResult {
  const base: UsePortfolioResult = {
    hasData: false,
    isMobile: false,
    isLoading: false,
    error: null,
    restoredFromStorage: false,
    portfolioData: null,
    filteredRows: [],
    filteredTreeMapNodes: [],
    filters: { investmentTypes: [], accounts: [] },
    setFilters: vi.fn(),
    sortConfig: { key: "totalValue", direction: "desc" as const },
    handleSort: vi.fn(),
    expandedRows: new Set<string>(),
    toggleExpand: vi.fn(),
    uploadFile: vi.fn(),
    clearData: vi.fn(),
    viewMode: "holdings" as const,
    setViewMode: vi.fn(),
    treeMapGrouping: "fund" as const,
    setTreeMapGrouping: vi.fn(),
    selectedFunds: [],
    toggleFundSelection: vi.fn(),
    clearSelectedFunds: vi.fn(),
    resetFilters: vi.fn(),
    fundOptions: [],
    treeMapWidth: 1200,
    treeMapHeight: 400,
    activeSummary: null,
    ...overrides,
  };

  return base;
}

describe("Home page routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders UploadView when no data is available", () => {
    mockUsePortfolio.mockReturnValue(makePortfolioReturn({ hasData: false }));
    render(<Home />);
    expect(screen.getByTestId("upload-view")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
  });

  it("renders loading skeleton when hasData but portfolioData is null", () => {
    mockUsePortfolio.mockReturnValue(
      makePortfolioReturn({ hasData: true, portfolioData: null, isLoading: true })
    );
    render(<Home />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(screen.queryByTestId("upload-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders Dashboard when data is fully loaded", () => {
    const mockData = {
      treeMapNodes: [],
      tableRows: [],
      positionRows: [],
      summary: {
        totalValue: 100000,
        totalGainLoss: 5000,
        totalGainLossPercent: 5,
        accounts: ["Account1"],
        investmentTypes: ["Stocks"],
      },
      lastUpdated: new Date().toISOString(),
    };

    mockUsePortfolio.mockReturnValue(
      makePortfolioReturn({ hasData: true, portfolioData: mockData })
    );

    render(<Home />);

    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("upload-view")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard")).toHaveAttribute(
      "data-intro-animation",
      "true"
    );
    expect(screen.getByTestId("dashboard")).toHaveAttribute(
      "data-value-animations",
      "true"
    );
  });

  it("disables intro and value animations while a restored session settles", () => {
    const mockData = {
      treeMapNodes: [],
      tableRows: [],
      positionRows: [],
      summary: {
        totalValue: 100000,
        totalGainLoss: 5000,
        totalGainLossPercent: 5,
        accounts: ["Account1"],
        investmentTypes: ["Stocks"],
      },
      lastUpdated: new Date().toISOString(),
    };

    mockUsePortfolio.mockReturnValue(
      makePortfolioReturn({
        hasData: true,
        portfolioData: mockData,
        restoredFromStorage: true,
      })
    );

    render(<Home />);

    expect(screen.getByTestId("dashboard")).toHaveAttribute(
      "data-intro-animation",
      "false"
    );
    expect(screen.getByTestId("dashboard")).toHaveAttribute(
      "data-value-animations",
      "false"
    );
  });

  it("passes error to UploadView when present", () => {
    mockUsePortfolio.mockReturnValue(
      makePortfolioReturn({ hasData: false, error: "Bad CSV" })
    );
    render(<Home />);
    expect(screen.getByText("Bad CSV")).toBeInTheDocument();
  });

  it("passes isLoading to UploadView during upload", () => {
    mockUsePortfolio.mockReturnValue(
      makePortfolioReturn({ hasData: false, isLoading: true })
    );
    render(<Home />);
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("shows the no-data fetch badge when restoring without cached portfolio data", () => {
    mockUsePortfolio.mockReturnValue(
      makePortfolioReturn({
        hasData: true,
        portfolioData: null,
        error: "Failed to compute portfolio data: Edge: Too Many Requests",
      })
    );

    render(<Home />);

    expect(screen.getByText("Live data unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Unable to load live portfolio data yet\./i)).toBeInTheDocument();
  });

  it("passes fetch errors through to the dashboard when cached data exists", () => {
    const mockData = {
      treeMapNodes: [],
      tableRows: [],
      positionRows: [],
      summary: {
        totalValue: 100000,
        totalGainLoss: 5000,
        totalGainLossPercent: 5,
        accounts: ["Account1"],
        investmentTypes: ["Stocks"],
      },
      lastUpdated: new Date().toISOString(),
    };

    mockUsePortfolio.mockReturnValue(
      makePortfolioReturn({
        hasData: true,
        portfolioData: mockData,
        error: "Failed to refresh portfolio data: Edge: Too Many Requests",
      })
    );

    render(<Home />);

    expect(screen.getByTestId("dashboard")).toHaveTextContent(
      "Failed to refresh portfolio data: Edge: Too Many Requests"
    );
  });
});
