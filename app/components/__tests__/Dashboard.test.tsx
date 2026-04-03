import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dashboard } from "../Dashboard";
import type { PortfolioData } from "@/lib/types";
import * as portfolioSelectors from "@/lib/portfolioSelectors";

const { mockUseIsStickyDocked } = vi.hoisted(() => ({
  mockUseIsStickyDocked: vi.fn(),
}));

vi.mock("@/hooks/useIsStickyDocked", () => ({
  useIsStickyDocked: mockUseIsStickyDocked,
}));

vi.mock("../TreeMap", () => ({
  TreeMap: (props: { isMobile?: boolean; enableIntroAnimation?: boolean }) => (
    <div
      data-testid="tree-map"
      data-mobile={props.isMobile ? "true" : "false"}
      data-intro-animation={props.enableIntroAnimation ? "true" : "false"}
    />
  ),
}));

vi.mock("../PortfolioTable", () => ({
  PortfolioTable: (props: {
    isMobile?: boolean;
    enableIntroAnimation?: boolean;
    enableValueAnimations?: boolean;
  }) => (
    <div
      data-testid="portfolio-table"
      data-mobile={props.isMobile ? "true" : "false"}
      data-intro-animation={props.enableIntroAnimation ? "true" : "false"}
      data-value-animations={props.enableValueAnimations ? "true" : "false"}
    />
  ),
}));

vi.mock("../FloatingToolbar", () => ({
  FloatingToolbar: (props: { isMobile?: boolean; enableIntroAnimation?: boolean }) => (
    <div
      data-testid="floating-toolbar"
      data-mobile={props.isMobile ? "true" : "false"}
      data-intro-animation={props.enableIntroAnimation ? "true" : "false"}
    />
  ),
}));

const portfolioData: PortfolioData = {
  treeMapNodes: [],
  tableRows: [],
  positionRows: [],
  summary: {
    totalValue: 20000,
    totalGainLoss: 1200,
    totalGainLossPercent: 6,
    accounts: ["Account A"],
    investmentTypes: ["ETFs"],
  },
  lastUpdated: new Date().toISOString(),
};

beforeEach(() => {
  mockUseIsStickyDocked.mockReturnValue([{ current: null }, false, 112]);
});

function renderDashboard({
  onBackToPicker = vi.fn(),
  enableIntroAnimation,
  enableValueAnimations,
  fetchError = null,
}: {
  onBackToPicker?: () => void;
  enableIntroAnimation?: boolean;
  enableValueAnimations?: boolean;
  fetchError?: string | null;
} = {}) {
  return {
    onBackToPicker,
    ...render(
      <Dashboard
        portfolioData={portfolioData}
        portfolioName="Sample beta portfolio"
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [], searchQuery: "" }}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={onBackToPicker}
        isLoading={false}
        viewMode="holdings"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={[]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={null}
        treeMapWidth={1200}
        treeMapHeight={400}
        enableIntroAnimation={enableIntroAnimation}
        enableValueAnimations={enableValueAnimations}
        fetchError={fetchError}
      />
    ),
  };
}

describe("Dashboard portfolio actions", () => {
  it("shows Your portfolio when nothing is filtered", () => {
    renderDashboard();

    expect(screen.getByText("Your portfolio")).toBeInTheDocument();
    expect(screen.getByText("Sample beta portfolio")).toBeInTheDocument();
  });

  it("renders a back button when nothing is filtered", () => {
    renderDashboard();

    const button = screen.getByRole("button", { name: /back to portfolios/i });
    expect(button).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove portfolio/i })).not.toBeInTheDocument();
  });

  it("goes back to the picker in a single click", () => {
    const { onBackToPicker } = renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /back to portfolios/i }));
    expect(onBackToPicker).toHaveBeenCalledTimes(1);
  });

  it("shows the active summary label in the header without a reset button", () => {
    render(
      <Dashboard
        portfolioData={portfolioData}
        portfolioName="Sample beta portfolio"
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [], searchQuery: "" }}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={vi.fn()}
        isLoading={false}
        viewMode="holdings"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={["FUND-A", "FUND-B"]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={{
          value: 12500,
          gainLoss: 2800,
          gainLossPercent: 28,
          label: "2 funds selected",
        }}
        treeMapWidth={1200}
        treeMapHeight={400}
      />
    );

    expect(screen.getByText("Sample beta portfolio")).toBeInTheDocument();
    expect(screen.getByText(/2 funds selected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to portfolios/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset filters" })).not.toBeInTheDocument();
  });

  it("renders a sticky search bar above the table and updates searchQuery", () => {
    vi.useFakeTimers();
    const onFiltersChange = vi.fn();

    render(
      <Dashboard
        portfolioData={portfolioData}
        portfolioName="Sample beta portfolio"
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [], searchQuery: "" }}
        onFiltersChange={onFiltersChange}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={vi.fn()}
        isLoading={false}
        viewMode="holdings"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={[]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={null}
        treeMapWidth={1200}
        treeMapHeight={400}
      />
    );

    const searchShell = screen.getByTestId("portfolio-search-shell");
    expect(searchShell).toBeInTheDocument();
    expect(screen.getByTestId("inline-holdings-count")).toHaveTextContent(
      "0 holdings"
    );
    expect(screen.getByRole("searchbox", { name: "Search portfolio" })).toHaveAttribute(
      "placeholder",
      "Search by name or symbol"
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search portfolio" }), {
      target: { value: "aapl" },
    });
    expect(onFiltersChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: [],
      searchQuery: "aapl",
    });
    vi.useRealTimers();
  });

  it("does not recompute visible counts on every search keystroke", () => {
    vi.useFakeTimers();
    const getFilteredRowsSpy = vi.spyOn(portfolioSelectors, "getFilteredRows");

    const onFiltersChange = vi.fn();
    render(
      <Dashboard
        portfolioData={{
          ...portfolioData,
          tableRows: [
            {
              symbol: "AAPL",
              name: "Apple Inc.",
              accounts: ["Account A"],
              investmentTypes: ["Stocks"],
              totalValue: 100,
              percentOfPortfolio: 100,
              currentPrice: 100,
              totalGainLossDollar: 10,
              totalGainLossPercent: 10,
              fiftyTwoWeekHigh: 120,
              fiftyTwoWeekLow: 80,
              isExpandable: false,
              sources: [],
            },
          ],
        }}
        portfolioName="Sample beta portfolio"
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [], searchQuery: "" }}
        onFiltersChange={onFiltersChange}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={vi.fn()}
        isLoading={false}
        viewMode="positions"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={[]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={null}
        treeMapWidth={1200}
        treeMapHeight={400}
      />
    );

    expect(getFilteredRowsSpy).toHaveBeenCalledTimes(1);

    const searchInput = screen.getByRole("searchbox", { name: "Search portfolio" });
    fireEvent.change(searchInput, { target: { value: "a" } });
    fireEvent.change(searchInput, { target: { value: "aa" } });
    fireEvent.change(searchInput, { target: { value: "aapl" } });

    expect(getFilteredRowsSpy).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: "aapl" })
    );

    vi.useRealTimers();
  });

  it("treats the docked header and search row as one shared surface", () => {
    mockUseIsStickyDocked.mockReturnValue([{ current: null }, true, 112]);

    renderDashboard();

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("is-search-docked");
    expect(header).toHaveClass("sticky-header");
    expect(header.querySelector("[data-testid='header-search-absorber']")).toBeNull();
    expect(screen.queryByTestId("portfolio-search-shell-background")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search portfolio" })).toHaveClass(
      "bg-surface/92"
    );
    expect(screen.getByRole("searchbox", { name: "Search portfolio" })).not.toHaveClass(
      "backdrop-blur-xl"
    );
  });

  it("shows and uses Clear button when search has text", () => {
    const onFiltersChange = vi.fn();
    render(
      <Dashboard
        portfolioData={portfolioData}
        portfolioName="Sample beta portfolio"
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [], searchQuery: "test" }}
        onFiltersChange={onFiltersChange}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={vi.fn()}
        isLoading={false}
        viewMode="holdings"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={[]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={null}
        treeMapWidth={1200}
        treeMapHeight={400}
      />
    );
    const clearBtn = screen.getByRole("button", { name: "Clear search" });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: [],
      searchQuery: "",
    });
  });

  it("renders the bare sticky search field on mobile too", () => {
    const onFiltersChange = vi.fn();

    render(
      <Dashboard
        portfolioData={{
          ...portfolioData,
          tableRows: [
            {
              symbol: "AAPL",
              name: "Apple Inc.",
              accounts: ["Account A"],
              investmentTypes: ["Stocks"],
              totalValue: 100,
              percentOfPortfolio: 100,
              currentPrice: 100,
              totalGainLossDollar: 10,
              totalGainLossPercent: 10,
              fiftyTwoWeekHigh: 120,
              fiftyTwoWeekLow: 80,
              isExpandable: false,
              sources: [],
            },
          ],
        }}
        portfolioName="Sample beta portfolio"
        filteredTreeMapNodes={[]}
        filteredRows={[
          {
            symbol: "AAPL",
            name: "Apple Inc.",
            accounts: ["Account A"],
            investmentTypes: ["Stocks"],
            totalValue: 100,
            percentOfPortfolio: 100,
            currentPrice: 100,
            totalGainLossDollar: 10,
            totalGainLossPercent: 10,
            fiftyTwoWeekHigh: 120,
            fiftyTwoWeekLow: 80,
            isExpandable: false,
            sources: [],
          },
        ]}
        isMobile
        filters={{ investmentTypes: [], accounts: [], searchQuery: "AAPL" }}
        onFiltersChange={onFiltersChange}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={vi.fn()}
        isLoading={false}
        viewMode="holdings"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={[]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={null}
        treeMapWidth={720}
        treeMapHeight={640}
      />
    );

    const searchShell = screen.getByTestId("portfolio-search-shell");
    expect(searchShell).toBeInTheDocument();
    expect(screen.getByTestId("inline-holdings-count")).toHaveTextContent(
      "1 holding"
    );
    expect(screen.getByRole("searchbox", { name: "Search portfolio" })).toHaveValue(
      "AAPL"
    );
  });

  it("renders the mobile variants inline on small screens", () => {
    render(
      <Dashboard
        portfolioData={portfolioData}
        portfolioName="Sample beta portfolio"
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile
        filters={{ investmentTypes: [], accounts: [], searchQuery: "" }}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={vi.fn()}
        isLoading={false}
        viewMode="holdings"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={[]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={null}
        treeMapWidth={720}
        treeMapHeight={640}
        fetchError={null}
      />
    );

    expect(screen.getByTestId("tree-map")).toHaveAttribute("data-mobile", "true");
    expect(screen.getByTestId("portfolio-table")).toHaveAttribute(
      "data-mobile",
      "true"
    );
    expect(screen.getByTestId("floating-toolbar")).toHaveAttribute(
      "data-mobile",
      "true"
    );
  });

  it("disables intro animations across the restored dashboard shell", () => {
    const { container } = renderDashboard({
      enableIntroAnimation: false,
      enableValueAnimations: false,
    });

    expect(container.firstChild).not.toHaveClass("animate-fade-in");
    expect(screen.getByTestId("tree-map")).toHaveAttribute(
      "data-intro-animation",
      "false"
    );
    expect(screen.getByTestId("portfolio-table")).toHaveAttribute(
      "data-intro-animation",
      "false"
    );
    expect(screen.getByTestId("portfolio-table")).toHaveAttribute(
      "data-value-animations",
      "false"
    );
    expect(screen.getByTestId("floating-toolbar")).toHaveAttribute(
      "data-intro-animation",
      "false"
    );
  });

  it("shows a prominent live data badge when refreshes fail", () => {
    renderDashboard({ fetchError: "Yahoo Finance rate limit hit" });

    expect(screen.getByText("Live data issue")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Latest live refresh failed\. Showing the last available portfolio snapshot\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Yahoo Finance rate limit hit/i)).toBeInTheDocument();
  });

  it("search bar is visible, interactive, and shares the header surface when docked with real data", () => {
    vi.useFakeTimers();

    const realRows: import("@/lib/types").TableRow[] = [
      {
        symbol: "AAPL", name: "Apple Inc.", accounts: ["Brokerage"],
        investmentTypes: ["Stocks"], totalValue: 45000, percentOfPortfolio: 22.5,
        currentPrice: 189.5, totalGainLossDollar: 12000, totalGainLossPercent: 36.4,
        fiftyTwoWeekHigh: 199.62, fiftyTwoWeekLow: 124.17, isExpandable: false, sources: [],
      },
      {
        symbol: "MSFT", name: "Microsoft Corp", accounts: ["Brokerage"],
        investmentTypes: ["Stocks"], totalValue: 38000, percentOfPortfolio: 19,
        currentPrice: 378.91, totalGainLossDollar: 9200, totalGainLossPercent: 31.9,
        fiftyTwoWeekHigh: 384.3, fiftyTwoWeekLow: 275.37, isExpandable: false, sources: [],
      },
      {
        symbol: "VTI", name: "Vanguard Total Stock Market ETF", accounts: ["401k"],
        investmentTypes: ["ETFs"], totalValue: 32000, percentOfPortfolio: 16,
        currentPrice: 236.12, totalGainLossDollar: 4800, totalGainLossPercent: 17.6,
        fiftyTwoWeekHigh: 242.89, fiftyTwoWeekLow: 193.05, isExpandable: true, sources: [],
      },
      {
        symbol: "GOOGL", name: "Alphabet Inc.", accounts: ["Brokerage"],
        investmentTypes: ["Stocks"], totalValue: 28000, percentOfPortfolio: 14,
        currentPrice: 141.8, totalGainLossDollar: 5600, totalGainLossPercent: 25,
        fiftyTwoWeekHigh: 153.78, fiftyTwoWeekLow: 101.43, isExpandable: false, sources: [],
      },
      {
        symbol: "AMZN", name: "Amazon.com Inc.", accounts: ["Brokerage"],
        investmentTypes: ["Stocks"], totalValue: 25000, percentOfPortfolio: 12.5,
        currentPrice: 178.25, totalGainLossDollar: 3400, totalGainLossPercent: 15.7,
        fiftyTwoWeekHigh: 189.77, fiftyTwoWeekLow: 118.35, isExpandable: false, sources: [],
      },
      {
        symbol: "BND", name: "Vanguard Total Bond Market ETF", accounts: ["401k"],
        investmentTypes: ["ETFs"], totalValue: 18000, percentOfPortfolio: 9,
        currentPrice: 72.54, totalGainLossDollar: -800, totalGainLossPercent: -4.3,
        fiftyTwoWeekHigh: 75.21, fiftyTwoWeekLow: 69.88, isExpandable: false, sources: [],
      },
      {
        symbol: "NVDA", name: "NVIDIA Corp", accounts: ["Brokerage"],
        investmentTypes: ["Stocks"], totalValue: 14000, percentOfPortfolio: 7,
        currentPrice: 875.28, totalGainLossDollar: 6200, totalGainLossPercent: 79.5,
        fiftyTwoWeekHigh: 974.94, fiftyTwoWeekLow: 373.56, isExpandable: false, sources: [],
      },
    ];

    const realPortfolioData: import("@/lib/types").PortfolioData = {
      treeMapNodes: [],
      tableRows: realRows,
      positionRows: realRows,
      summary: {
        totalValue: 200000,
        totalGainLoss: 40400,
        totalGainLossPercent: 25.3,
        accounts: ["Brokerage", "401k"],
        investmentTypes: ["Stocks", "ETFs"],
      },
      lastUpdated: new Date().toISOString(),
    };

    mockUseIsStickyDocked.mockReturnValue([{ current: null }, true, 112]);

    const onFiltersChange = vi.fn();
    render(
      <Dashboard
        portfolioData={realPortfolioData}
        portfolioName="Retirement + Brokerage"
        portfolioId="port-abc-123"
        filteredTreeMapNodes={[]}
        filteredRows={realRows}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [], searchQuery: "" }}
        onFiltersChange={onFiltersChange}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onBackToPicker={vi.fn()}
        isLoading={false}
        viewMode="holdings"
        onViewModeChange={vi.fn()}
        treeMapGrouping="fund"
        onTreeMapGroupingChange={vi.fn()}
        selectedFunds={[]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={null}
        treeMapWidth={1400}
        treeMapHeight={500}
      />
    );

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("sticky-header", "is-search-docked");

    expect(header.querySelector(".sticky-header-search-absorber")).toBeNull();

    const searchInput = screen.getByRole("searchbox", { name: "Search portfolio" });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toBeVisible();
    expect(searchInput).toBeEnabled();
    expect(searchInput).toHaveAttribute("placeholder", "Search by name or symbol");

    expect(searchInput).toHaveClass("bg-surface/92");
    expect(searchInput).not.toHaveClass("backdrop-blur-xl");

    expect(screen.getByTestId("inline-holdings-count")).toHaveTextContent("7 holdings");

    fireEvent.change(searchInput, { target: { value: "Apple" } });
    expect(searchInput).toHaveValue("Apple");

    vi.advanceTimersByTime(250);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: "Apple" })
    );

    fireEvent.change(searchInput, { target: { value: "" } });
    vi.advanceTimersByTime(250);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: "" })
    );

    const searchShell = screen.getByTestId("portfolio-search-shell");
    expect(searchShell).toHaveClass("sticky");
    expect(searchShell).toHaveClass("z-50");

    vi.useRealTimers();
  });
});
