import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FloatingToolbar } from "../FloatingToolbar";

function makeProps(): ComponentProps<typeof FloatingToolbar> {
  return {
    summary: {
      totalValue: 20000,
      totalGainLoss: 1200,
      totalGainLossPercent: 6,
      accounts: ["Account A", "Account B"],
      investmentTypes: ["Stocks", "ETFs"],
    },
    filters: {
      investmentTypes: [],
      accounts: [],
    },
    onFiltersChange: vi.fn(),
    lastUpdated: new Date().toISOString(),
    onRefresh: vi.fn(),
    isRefreshing: false,
    viewMode: "holdings" as const,
    onViewModeChange: vi.fn(),
    treeMapGrouping: "fund" as const,
    onTreeMapGroupingChange: vi.fn(),
    fundOptions: [
      {
        symbol: "FUND-A",
        name: "Synthetic Market Fund",
        color: "#4E9999",
        value: 1000,
        hasChildren: true,
      },
      {
        symbol: "FUND-B",
        name: "Synthetic Global Fund",
        color: "#8B74AB",
        value: 800,
        hasChildren: true,
      },
    ],
    selectedFunds: [] as string[],
    onToggleFund: vi.fn(),
    onClearFunds: vi.fn(),
    onResetFilters: vi.fn(),
  };
}

describe("FloatingToolbar", () => {
  it("switches treemap grouping", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Flat" }));
    expect(props.onTreeMapGroupingChange).toHaveBeenCalledWith("holding");
  });

  it("resets toolbar filters including funds", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks"],
      accounts: ["Account A"],
    };
    props.selectedFunds = ["FUND-A"];

    render(<FloatingToolbar {...props} />);

    const resetButton = screen.getByRole("button", { name: "Reset filters" });
    expect(resetButton).toHaveAttribute("title", "Reset all filters");
    expect(screen.queryByText("Reset filters")).not.toBeInTheDocument();

    fireEvent.click(resetButton);

    expect(props.onResetFilters).toHaveBeenCalledTimes(1);
  });

  it("opens separate filter cards and updates the account filter", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    const accountCard = screen.getByText("Account");
    const typesCard = screen.getByText("Types");
    const fundsCard = screen.getByText("Funds");

    expect(accountCard).toBeInTheDocument();
    expect(typesCard).toBeInTheDocument();
    expect(fundsCard).toBeInTheDocument();
    expect(
      typesCard.compareDocumentPosition(fundsCard) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Account B" },
    });

    expect(props.onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: ["Account B"],
    });
  });

  it("toggles funds from the filters card", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "FUND-A" }));

    expect(props.onToggleFund).toHaveBeenCalledWith("FUND-A");
  });

  it("clears selected types from the filters card", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks"],
      accounts: [],
    };

    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "All types" }));

    expect(props.onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: [],
    });
  });

  it("shows the active filter count in the filters button", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks", "ETFs"],
      accounts: ["Account A"],
    };
    props.selectedFunds = ["FUND-A"];

    render(<FloatingToolbar {...props} />);

    expect(
      screen.getByRole("button", { name: "Filters (4)" })
    ).toBeInTheDocument();
  });

  it("shows top-level filter summaries when filters are active", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks"],
      accounts: ["Account A"],
    };
    props.selectedFunds = ["FUND-A"];

    render(<FloatingToolbar {...props} />);

    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Account A")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Stocks")).toBeInTheDocument();
    expect(screen.getByText("Fund")).toBeInTheDocument();
    expect(screen.getByText("FUND-A")).toBeInTheDocument();
  });

  it("shows all-filters hint when nothing is active", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    expect(
      screen.getByText("All accounts, all funds, all types")
    ).toBeInTheDocument();
  });

  it("renders as an inline panel on mobile", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks"],
      accounts: [],
    };
    const { container } = render(<FloatingToolbar {...props} isMobile />);

    expect(container.firstElementChild).toHaveClass("w-full");
    expect(container.querySelector(".fixed")).not.toBeInTheDocument();

    const resetButton = screen.getByRole("button", { name: "Reset filters" });
    const holdingsButton = screen.getByRole("button", { name: "Holdings" });

    expect(
      resetButton.compareDocumentPosition(holdingsButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Stocks")).toBeInTheDocument();
  });

  it("uses a stable desktop width for the toolbar shell", () => {
    const props = makeProps();
    const { container } = render(<FloatingToolbar {...props} />);

    const panel = container.firstElementChild?.firstElementChild;

    expect(panel).toHaveClass("lg:w-[72vw]");
    expect(panel).toHaveClass("lg:max-w-[1080px]");
  });
});
