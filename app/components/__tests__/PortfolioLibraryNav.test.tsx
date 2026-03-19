import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PortfolioLibraryNav } from "../PortfolioLibraryNav";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("PortfolioLibraryNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there are no saved files", () => {
    render(<PortfolioLibraryNav portfolios={[]} onRemovePortfolio={vi.fn()} />);

    expect(screen.queryByText("Saved files")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose a portfolio to open")).not.toBeInTheDocument();
    expect(screen.queryByText("No portfolios uploaded yet.")).not.toBeInTheDocument();
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
