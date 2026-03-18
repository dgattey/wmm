import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dashboard } from "../Dashboard";
import type { PortfolioData } from "@/lib/types";

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

function renderDashboard({
  onClearData = vi.fn(),
  enableIntroAnimation,
  enableValueAnimations,
  fetchError = null,
}: {
  onClearData?: () => void;
  enableIntroAnimation?: boolean;
  enableValueAnimations?: boolean;
  fetchError?: string | null;
} = {}) {
  return {
    onClearData,
    ...render(
      <Dashboard
        portfolioData={portfolioData}
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [] }}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onClearData={onClearData}
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

describe("Dashboard clear action", () => {
  it("shows Your portfolio when nothing is filtered", () => {
    renderDashboard();

    expect(screen.getByText("Your portfolio")).toBeInTheDocument();
    expect(screen.getByText("Your portfolio").parentElement).toHaveClass("min-h-9");
  });

  it("renders a visible larger clear button", () => {
    renderDashboard();

    const button = screen.getByRole("button", { name: /clear file/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Clear file");
    expect(button).toHaveClass("min-h-11");
  });

  it("clears uploaded data in a single click", () => {
    const { onClearData } = renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /clear file/i }));
    expect(onClearData).toHaveBeenCalledTimes(1);
  });

  it("shows the active summary label in the header", () => {
    const onResetFilters = vi.fn();
    render(
      <Dashboard
        portfolioData={portfolioData}
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [] }}
        onFiltersChange={vi.fn()}
        onResetFilters={onResetFilters}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onClearData={vi.fn()}
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

    expect(screen.getByText("2 funds selected")).toBeInTheDocument();
    const resetButton = screen.getByRole("button", { name: "Reset filters" });
    expect(resetButton).toHaveAttribute("title", "Reset all filters");
    expect(screen.queryByText("Reset filters")).not.toBeInTheDocument();
    fireEvent.click(resetButton);
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it("renders a sticky search bar above the table and updates searchQuery", () => {
    vi.useFakeTimers();
    const onFiltersChange = vi.fn();

    render(
      <Dashboard
        portfolioData={portfolioData}
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [] }}
        onFiltersChange={onFiltersChange}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onClearData={vi.fn()}
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
    expect(searchShell).toHaveClass("sticky");
    expect(searchShell).toHaveClass("top-[7rem]");
    expect(screen.getByTestId("inline-holdings-count")).toHaveTextContent(
      "0 holdings"
    );
    expect(screen.getByRole("searchbox", { name: "Search portfolio" })).toHaveAttribute(
      "placeholder",
      "Search by name or symbol"
    );
    expect(screen.queryByText("Search portfolio")).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing \d+ holdings?/)).not.toBeInTheDocument();

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

  it("shows and uses Clear button when search has text", () => {
    const onFiltersChange = vi.fn();
    render(
      <Dashboard
        portfolioData={portfolioData}
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
        onClearData={vi.fn()}
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
      searchQuery: "test",
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
        onClearData={vi.fn()}
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
    expect(searchShell).toHaveClass("sticky");
    expect(searchShell).toHaveClass("top-[5.75rem]");
    expect(screen.getByTestId("inline-holdings-count")).toHaveTextContent(
      "1 holding"
    );
    expect(screen.getByRole("searchbox", { name: "Search portfolio" })).toHaveValue(
      "AAPL"
    );
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("renders the mobile variants inline on small screens", () => {
    render(
      <Dashboard
        portfolioData={portfolioData}
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile
        filters={{ investmentTypes: [], accounts: [] }}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        onClearData={vi.fn()}
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
});
