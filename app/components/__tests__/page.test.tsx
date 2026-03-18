import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the hooks and child components to test routing logic in isolation
vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolio: vi.fn(),
}));

vi.mock("../UploadView", () => ({
  UploadView: (props: { isLoading?: boolean; error?: string | null }) => (
    <div data-testid="upload-view">
      {props.isLoading && <span>Loading</span>}
      {props.error && <span>{props.error}</span>}
      Upload View
    </div>
  ),
}));

vi.mock("../Dashboard", () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>,
}));

import Home from "../../page";
import { usePortfolio } from "@/hooks/usePortfolio";

const mockUsePortfolio = vi.mocked(usePortfolio);

function makePortfolioReturn(overrides: Partial<ReturnType<typeof usePortfolio>> = {}) {
  return {
    hasData: false,
    isLoading: false,
    error: null,
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
    treeMapGrouping: "fund" as const,
    setTreeMapGrouping: vi.fn(),
    selectedFunds: [],
    toggleFundSelection: vi.fn(),
    clearSelectedFunds: vi.fn(),
    fundOptions: [],
    activeSummary: null,
    ...overrides,
  };
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
    // The loading skeleton has shimmer divs
    expect(screen.queryByTestId("upload-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
    // Check for skeleton elements
    const skeletons = document.querySelectorAll(".skeleton");
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
});
