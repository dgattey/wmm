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
    fundOptions: [
      {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        color: "#4E9999",
        value: 1000,
        hasChildren: true,
      },
      {
        symbol: "VXUS",
        name: "Vanguard Total International Stock ETF",
        color: "#8B74AB",
        value: 800,
        hasChildren: true,
      },
    ],
    selectedFunds: [] as string[],
    onToggleFund: vi.fn(),
    onClearFunds: vi.fn(),
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
      accounts: ["Brokerage"],
    };
    props.selectedFunds = ["VTI"];

    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(props.onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: [],
    });
    expect(props.onClearFunds).toHaveBeenCalledTimes(1);
  });

  it("opens separate filter cards and updates the account filter", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Funds")).toBeInTheDocument();
    expect(screen.getByText("Types")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Roth IRA" },
    });

    expect(props.onFiltersChange).toHaveBeenCalledWith({
      investmentTypes: [],
      accounts: ["Roth IRA"],
    });
  });

  it("toggles funds from the filters card", () => {
    const props = makeProps();
    render(<FloatingToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "VTI" }));

    expect(props.onToggleFund).toHaveBeenCalledWith("VTI");
  });

  it("shows the active filter count in the filters button", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks", "ETFs"],
      accounts: ["Brokerage"],
    };
    props.selectedFunds = ["VTI"];

    render(<FloatingToolbar {...props} />);

    expect(
      screen.getByRole("button", { name: "Filters (4)" })
    ).toBeInTheDocument();
  });

  it("shows top-level filter summaries when filters are active", () => {
    const props = makeProps();
    props.filters = {
      investmentTypes: ["Stocks"],
      accounts: ["Brokerage"],
    };
    props.selectedFunds = ["VTI"];

    render(<FloatingToolbar {...props} />);

    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Brokerage")).toBeInTheDocument();
    expect(screen.getByText("Fund")).toBeInTheDocument();
    expect(screen.getByText("VTI")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Stocks")).toBeInTheDocument();
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
