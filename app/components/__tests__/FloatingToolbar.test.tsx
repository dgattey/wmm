import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FloatingToolbar } from "../FloatingToolbar";

function makeProps() {
  return {
    summary: {
      totalValue: 100000,
      totalGainLoss: 5000,
      totalGainLossPercent: 5,
      accounts: ["Brokerage", "Roth IRA"],
      investmentTypes: ["Stocks", "ETFs"],
    },
    filters: {
      investmentTypes: [],
      accounts: [],
    },
    onFiltersChange: vi.fn(),
    lastUpdated: new Date().toISOString(),
    viewMode: "holdings" as const,
    onViewModeChange: vi.fn(),
    treeMapGrouping: "fund" as const,
    onTreeMapGroupingChange: vi.fn(),
  };
}

describe("FloatingToolbar", () => {
  it("switches treemap grouping", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Flat" }));
    expect(props.onTreeMapGroupingChange).toHaveBeenCalledWith("holding");
  });

  it("resets only the active filters", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks"],
      accounts: ["Brokerage"],
    };

    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(props.onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: [],
    });
  });

  it("opens the filter panel and updates the account filter", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Roth IRA" },
    });

    expect(props.onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: ["Roth IRA"],
    });
  });

  it("shows the active filter count in the filters button", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks", "ETFs"],
      accounts: ["Brokerage"],
    };

    render(<FloatingToolbar {...props} />);

    expect(
      screen.getByRole("button", { name: "Filters (3)" })
    ).toBeInTheDocument();
  });

  it("renders as an inline panel on mobile", () => {
    const props = makeProps();
    const { container } = render(<FloatingToolbar {...props} isMobile />);

    expect(container.firstElementChild).toHaveClass("w-full");
    expect(container.querySelector(".fixed")).not.toBeInTheDocument();
  });
});
