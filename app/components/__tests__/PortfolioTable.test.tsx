import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PortfolioTable } from "../PortfolioTable";
import type { TableRow } from "@/lib/types";

const rows: TableRow[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    accounts: ["DG stocks", "Roth IRA"],
    investmentTypes: ["Stocks", "ETFs", "Mutual Funds"],
    totalValue: 47301.8,
    percentOfPortfolio: 32.6,
    currentPrice: 950,
    totalGainLossDollar: 1000,
    totalGainLossPercent: 6.46,
    fiftyTwoWeekHigh: 1200,
    fiftyTwoWeekLow: 500,
    isExpandable: true,
    sources: [
      {
        type: "direct",
        sourceSymbol: "DIRECT",
        sourceName: "DG stocks",
        value: 47301.8,
        percentOfSource: 100,
        percentOfPortfolio: 32.6,
        account: "DG stocks",
        investmentType: "Stocks",
      },
    ],
  },
];

describe("PortfolioTable", () => {
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

    expect(screen.getAllByText("+32.60%")).toHaveLength(1);

    fireEvent.click(screen.getByText("NVIDIA Corporation"));

    expect(screen.getAllByText("+32.60%")).toHaveLength(2);
    expect(screen.queryByText("100.0%")).not.toBeInTheDocument();
  });
});
