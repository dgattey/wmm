import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PortfolioTable } from "../PortfolioTable";
import type { TableRow } from "@/lib/types";

const fundSourcedRow: TableRow = {
  symbol: "XOM",
  name: "Exxon Mobil Corporation",
  accounts: ["Roth IRA"],
  investmentTypes: ["ETFs"],
  totalValue: 697.57,
  percentOfPortfolio: 2.5,
  currentPrice: 110,
  totalGainLossDollar: 0,
  totalGainLossPercent: 0,
  fiftyTwoWeekHigh: 120,
  fiftyTwoWeekLow: 100,
  isExpandable: false,
  sources: [
    {
      type: "fund",
      sourceSymbol: "FXAIX",
      sourceName: "Fidelity 500 Index Fund",
      value: 697.57,
      percentOfSource: 1.2,
      percentOfPortfolio: 2.5,
      account: "Roth IRA",
      investmentType: "Mutual Funds",
    },
  ],
};

const rows: TableRow[] = [
  {
    symbol: "FUND-A",
    name: "Synthetic Allocation Sleeve",
    accounts: ["Account A", "Account B", "Account C"],
    investmentTypes: ["Stocks", "ETFs", "Mutual Funds"],
    totalValue: 4800,
    percentOfPortfolio: 32,
    currentPrice: 120,
    totalGainLossDollar: 240,
    totalGainLossPercent: 5,
    fiftyTwoWeekHigh: 150,
    fiftyTwoWeekLow: 90,
    isExpandable: true,
    sources: [
      {
        type: "direct",
        sourceSymbol: "DIRECT",
        sourceName: "Account A",
        value: 4800,
        percentOfSource: 100,
        percentOfPortfolio: 32,
        account: "Account A",
        investmentType: "Stocks",
      },
    ],
  },
];

describe("PortfolioTable", () => {
  it("wraps long account lists on desktop so trailing columns stay visible", () => {
    const { container } = render(
      <PortfolioTable
        rows={rows}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
      />
    );

    const table = container.querySelector("table");
    const accountCell = screen
      .getByText("Account A, Account B, Account C")
      .closest("td");

    expect(table).toHaveClass("min-w-[980px]");
    expect(accountCell).toHaveClass("whitespace-normal");
    expect(accountCell).toHaveAttribute("title", "Account A, Account B, Account C");
  });

  it("shows source fund tickers in aggregated (holdings) table view", () => {
    const { container } = render(
      <PortfolioTable
        rows={[fundSourcedRow]}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        viewMode="holdings"
      />
    );

    expect(screen.getByText("Source funds")).toBeInTheDocument();
    expect(screen.getByText("FXAIX")).toBeInTheDocument();

    const table = container.querySelector("table");
    expect(table).toHaveClass("min-w-[1060px]");
  });

  it("does not show source funds column in positions table view", () => {
    render(
      <PortfolioTable
        rows={[fundSourcedRow]}
        sortConfig={{ key: "totalValue", direction: "desc" }}
        onSort={vi.fn()}
        expandedRows={new Set()}
        onToggleExpand={vi.fn()}
        viewMode="positions"
      />
    );

    expect(screen.queryByRole("columnheader", { name: "Source funds" })).not.toBeInTheDocument();
    expect(screen.queryByText("FXAIX")).not.toBeInTheDocument();
  });

  it("shows expanded source rows as portfolio percentages", () => {
    function TestHarness() {
      const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

      return (
        <PortfolioTable
          rows={rows}
          sortConfig={{ key: "totalValue", direction: "desc" }}
          onSort={vi.fn()}
          expandedRows={expandedRows}
          onToggleExpand={(symbol) =>
            setExpandedRows((prev) => {
              const next = new Set(prev);
              if (next.has(symbol)) {
                next.delete(symbol);
              } else {
                next.add(symbol);
              }
              return next;
            })
          }
        />
      );
    }

    render(<TestHarness />);

    expect(screen.getAllByText("+32.00%")).toHaveLength(1);

    fireEvent.click(screen.getByText("Synthetic Allocation Sleeve"));

    expect(screen.getAllByText("+32.00%")).toHaveLength(2);
    expect(screen.queryByText("100.0%")).not.toBeInTheDocument();
  });

  it("renders mobile cards with sort controls and expandable breakdowns", () => {
    function TestHarness() {
      const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

      return (
        <PortfolioTable
          rows={rows}
          sortConfig={{ key: "totalValue", direction: "desc" }}
          onSort={vi.fn()}
          expandedRows={expandedRows}
          onToggleExpand={(symbol) =>
            setExpandedRows((prev) => {
              const next = new Set(prev);
              if (next.has(symbol)) {
                next.delete(symbol);
              } else {
                next.add(symbol);
              }
              return next;
            })
          }
          isMobile
        />
      );
    }

    render(<TestHarness />);

    expect(screen.getByRole("combobox", { name: "Sort holdings" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show breakdown" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show breakdown" }));

    expect(screen.getByText("Source breakdown")).toBeInTheDocument();
    expect(screen.getByText("Direct holding")).toBeInTheDocument();
  });
});
