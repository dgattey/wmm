import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dashboard } from "../Dashboard";
import type { PortfolioData } from "@/lib/types";

vi.mock("../TreeMap", () => ({
  TreeMap: (props: { isMobile?: boolean }) => (
    <div data-testid="tree-map" data-mobile={props.isMobile ? "true" : "false"} />
  ),
}));

vi.mock("../PortfolioTable", () => ({
  PortfolioTable: (props: { isMobile?: boolean }) => (
    <div
      data-testid="portfolio-table"
      data-mobile={props.isMobile ? "true" : "false"}
    />
  ),
}));

vi.mock("../FloatingToolbar", () => ({
  FloatingToolbar: (props: { isMobile?: boolean }) => (
    <div
      data-testid="floating-toolbar"
      data-mobile={props.isMobile ? "true" : "false"}
    />
  ),
}));

const portfolioData: PortfolioData = {
  treeMapNodes: [],
  tableRows: [],
  positionRows: [],
  summary: {
    totalValue: 100000,
    totalGainLoss: 5000,
    totalGainLossPercent: 5,
    accounts: ["DG 401K"],
    investmentTypes: ["Others"],
  },
  lastUpdated: new Date().toISOString(),
};

function renderDashboard(onClearData = vi.fn()) {
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
      />
    ),
  };
}

describe("Dashboard clear action", () => {
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
    render(
      <Dashboard
        portfolioData={portfolioData}
        filteredTreeMapNodes={[]}
        filteredRows={[]}
        isMobile={false}
        filters={{ investmentTypes: [], accounts: [] }}
        onFiltersChange={vi.fn()}
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
        selectedFunds={["09261F572", "VTI"]}
        onToggleFund={vi.fn()}
        onClearFunds={vi.fn()}
        fundOptions={[]}
        activeSummary={{
          value: 137194.21,
          gainLoss: 94943.14,
          gainLossPercent: 39.48,
          label: "2 funds selected",
        }}
        treeMapWidth={1200}
        treeMapHeight={400}
      />
    );

    expect(screen.getByText("2 funds selected")).toBeInTheDocument();
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
});
