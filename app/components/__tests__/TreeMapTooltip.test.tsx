import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TreeMapTooltip } from "../TreeMapTooltip";
import type { TreeMapNode } from "@/lib/types";

const node: TreeMapNode = {
  id: "asset-a-1",
  symbol: "ASSET-A",
  name: "Synthetic Equity Sleeve",
  value: 1200,
  color: "#7dd3fc",
  parentSymbol: "FUND-A",
  parentName: "Synthetic Allocation Fund",
  percentOfParent: 37.5,
  percentOfPortfolio: 12,
  x0: 0,
  y0: 0,
  x1: 100,
  y1: 100,
  depth: 2,
  currentPrice: 24,
  totalGainLossDollar: 1.2,
  totalGainLossPercent: 5,
  fiftyTwoWeekHigh: 30,
  fiftyTwoWeekLow: 18,
  investmentType: "ETFs",
  account: "Account A",
};

describe("TreeMapTooltip", () => {
  it("shows derived-from fund name and symbol for child holdings", () => {
    const { container } = render(
      <TreeMapTooltip node={node} mouseX={100} mouseY={100} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.getByText("ASSET-A")).toBeInTheDocument();
    expect(screen.getByText(/derived from/i)).toBeInTheDocument();
    expect(screen.getByText("Synthetic Allocation Fund (FUND-A)")).toBeInTheDocument();
    expect(screen.getByText("37.5% of this fund")).toBeInTheDocument();
  });

  it("renders nothing when no node is hovered", () => {
    const { container } = render(
      <TreeMapTooltip node={null} mouseX={100} mouseY={100} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("clamps tooltip position within a narrow viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 480,
    });

    render(<TreeMapTooltip node={node} mouseX={310} mouseY={470} />);

    const tooltip = screen.getByText("ASSET-A").closest(".fixed") as HTMLElement;
    expect(tooltip).toHaveStyle({ left: "16px", top: "258px" });
  });

  it("renders at the document level so it can layer above later sections", () => {
    render(<TreeMapTooltip node={node} mouseX={140} mouseY={140} />);

    const tooltip = screen.getByText("ASSET-A").closest(".fixed") as HTMLElement;
    expect(tooltip.parentElement).toBe(document.body);
    expect(tooltip).toHaveClass("z-30");
  });
});
