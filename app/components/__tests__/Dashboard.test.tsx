import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dashboard } from "../Dashboard";
import type { PortfolioData } from "@/lib/types";

vi.mock("../TreeMap", () => ({
  TreeMap: () => <div data-testid="tree-map" />,
}));

vi.mock("../PortfolioTable", () => ({
  PortfolioTable: () => <div data-testid="portfolio-table" />,
}));

vi.mock("../FloatingToolbar", () => ({
  FloatingToolbar: () => <div data-testid="floating-toolbar" />,
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
        focusedFund={null}
        onFocusFund={vi.fn()}
        focusedSummary={null}
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
});
