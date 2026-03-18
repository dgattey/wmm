import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PortfolioLibraryNav } from "../PortfolioLibraryNav";

describe("PortfolioLibraryNav", () => {
  it("hides the choose-a-portfolio heading when there are no saved files", () => {
    render(<PortfolioLibraryNav portfolios={[]} onRemovePortfolio={vi.fn()} />);

    expect(screen.getByText("Saved files")).toBeInTheDocument();
    expect(screen.queryByText("Choose a portfolio to open")).not.toBeInTheDocument();
    expect(screen.getByText("No portfolios uploaded yet.")).toBeInTheDocument();
  });

  it("shows the heading and allows deleting saved files", () => {
    const onRemovePortfolio = vi.fn();

    render(
      <PortfolioLibraryNav
        portfolios={[
          {
            id: "beta",
            name: "sample_portfolio_beta",
            sourceFileName: "sample_portfolio_beta.csv",
            uploadedAt: "2026-03-18T00:00:00.000Z",
            lastViewedAt: "2026-03-18T00:00:00.000Z",
            positionCount: 1,
            totalValue: 3000,
          },
        ]}
        onRemovePortfolio={onRemovePortfolio}
      />
    );

    expect(screen.getByText("Choose a portfolio to open")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove sample_portfolio_beta/i }));
    expect(onRemovePortfolio).toHaveBeenCalledWith("beta");
  });
});
