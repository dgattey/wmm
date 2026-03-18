import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("../components/UploadView", () => ({
  UploadView: (props: {
    onFilesSelect: (files: File[]) => void;
    error?: string | null;
    isLoading?: boolean;
  }) => (
    <div data-testid="upload-view">
      <button
        type="button"
        onClick={() =>
          props.onFilesSelect([
            new File(["first"], "alpha.csv", { type: "text/csv" }),
            new File(["second"], "beta.csv", { type: "text/csv" }),
          ])
        }
      >
        Upload files
      </button>
      {props.isLoading && <span>Loading</span>}
      {props.error && <span>{props.error}</span>}
    </div>
  ),
}));

vi.mock("../components/PortfolioLibraryNav", () => ({
  PortfolioLibraryNav: (props: { portfolios: Array<{ name: string }> }) => (
    <div data-testid="portfolio-library-nav">
      {props.portfolios.map((portfolio) => portfolio.name).join(",")}
    </div>
  ),
}));

vi.mock("@/hooks/usePortfolioLibrary", () => ({
  usePortfolioLibrary: vi.fn(),
}));

import Home from "../page";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

const mockUsePortfolioLibrary = vi.mocked(usePortfolioLibrary);

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the upload route UI on root", () => {
    mockUsePortfolioLibrary.mockReturnValue({
      portfolios: [{ id: "alpha", name: "alpha", sourceFileName: "alpha.csv" }],
      isUploading: false,
      error: null,
      setError: vi.fn(),
      refreshLibrary: vi.fn(),
      uploadFiles: vi.fn(),
      removePortfolioById: vi.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Portfolio allocation")).toBeInTheDocument();
    expect(screen.queryByText("Portfolio picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("upload-view")).toBeInTheDocument();
    expect(screen.getByTestId("portfolio-library-nav")).toHaveTextContent("alpha");
  });

  it("navigates to the newest uploaded portfolio route", async () => {
    mockUsePortfolioLibrary.mockReturnValue({
      portfolios: [],
      isUploading: false,
      error: null,
      setError: vi.fn(),
      refreshLibrary: vi.fn(),
      uploadFiles: vi.fn().mockResolvedValue({
        uploadedPortfolios: [
          { id: "alpha", name: "alpha", sourceFileName: "alpha.csv" },
          { id: "beta", name: "beta", sourceFileName: "beta.csv" },
        ],
        failedUploads: [],
      }),
      removePortfolioById: vi.fn(),
    });

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Upload files" }));

    expect(await screen.findByTestId("upload-view")).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/portfolio/beta");
  });
});
