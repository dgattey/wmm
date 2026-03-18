import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TreeMapTooltip } from "../TreeMapTooltip";
import type { TreeMapNode } from "@/lib/types";

const node: TreeMapNode = {
  id: "ixus-1",
  symbol: "IXUS",
  name: "iShares Core MSCI Total Intl Stk ETF",
  value: 125895.79,
  color: "#7dd3fc",
  parentSymbol: "09261F572",
  parentName: "BTC LPATH IDX 2055 M",
  percentOfParent: 37.5,
  percentOfPortfolio: 5.6,
  x0: 0,
  y0: 0,
  x1: 100,
  y1: 100,
  depth: 2,
  currentPrice: 88.13,
  totalGainLossDollar: 0.33,
  totalGainLossPercent: 0.38,
  fiftyTwoWeekHigh: 94.62,
  fiftyTwoWeekLow: 61.75,
  investmentType: "Others",
  account: "DG 401K",
};

describe("TreeMapTooltip", () => {
  it("shows derived-from fund name and symbol for child holdings", () => {
    render(<TreeMapTooltip node={node} mouseX={100} mouseY={100} />);

    expect(screen.getByText("IXUS")).toBeInTheDocument();
    expect(screen.getByText(/derived from/i)).toBeInTheDocument();
    expect(
      screen.getByText("BTC LPATH IDX 2055 M (09261F572)")
    ).toBeInTheDocument();
    expect(screen.getByText("37.5% of this fund")).toBeInTheDocument();
  });

  it("renders nothing when no node is hovered", () => {
    const { container } = render(
      <TreeMapTooltip node={null} mouseX={100} mouseY={100} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
