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
        filters={{ investmentTypes: [], accounts: [] }}
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

  it("shows the active summary label in the header", () => {
    const onResetFilters = vi.fn();
    render(
      <Dashboard
        portfolioData={portfolioData}
        portfolioName="Sample beta portfolio"
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
    expect(screen.getByText("2 funds selected")).toBeInTheDocument();
    const resetButton = screen.getByRole("button", { name: "Reset filters" });
    expect(resetButton).toHaveAttribute("title", "Reset all filters");
    expect(screen.queryByRole("button", { name: /back to portfolios/i })).not.toBeInTheDocument();
    fireEvent.click(resetButton);
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it("renders the mobile variants inline on small screens", () => {
    render(
      <Dashboard
        portfolioData={portfolioData}
        portfolioName="Sample beta portfolio"
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
});
