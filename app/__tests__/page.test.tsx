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
import { PendingUploadProvider } from "../contexts/PendingUploadContext";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

const mockUsePortfolioLibrary = vi.mocked(usePortfolioLibrary);

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <PendingUploadProvider>
      {ui}
    </PendingUploadProvider>
  );
}

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the upload route UI on root", () => {
    mockUsePortfolioLibrary.mockReturnValue({
      portfolios: [
        {
          id: "alpha",
          name: "alpha",
          sourceFileName: "alpha.csv",
          uploadedAt: "2026-03-18T00:00:00.000Z",
          lastViewedAt: "2026-03-18T00:00:00.000Z",
          positionCount: 1,
        },
      ],
      isUploading: false,
      error: null,
      setError: vi.fn(),
      refreshLibrary: vi.fn(),
      uploadFiles: vi.fn(),
      removePortfolioById: vi.fn(),
      renamePortfolio: vi.fn(),
    });

    renderWithProvider(<Home />);

    expect(screen.getByText("WMM")).toBeInTheDocument();
    expect(screen.queryByText("Portfolio picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("upload-view")).toBeInTheDocument();
    expect(screen.getByTestId("portfolio-library-nav")).toHaveTextContent("alpha");
  });

  it("navigates to uploading route immediately when files are selected", () => {
    mockUsePortfolioLibrary.mockReturnValue({
      portfolios: [],
      isUploading: false,
      error: null,
      setError: vi.fn(),
      refreshLibrary: vi.fn(),
      uploadFiles: vi.fn(),
      removePortfolioById: vi.fn(),
      renamePortfolio: vi.fn(),
    });

    renderWithProvider(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Upload files" }));

    // Home navigates to /portfolio/uploading immediately; that route processes
    // and redirects to the portfolio.
    expect(pushMock).toHaveBeenCalledWith("/portfolio/uploading");
  });

  it("omits the saved-files section when there are no uploaded portfolios", () => {
    mockUsePortfolioLibrary.mockReturnValue({
      portfolios: [],
      isUploading: false,
      error: null,
      setError: vi.fn(),
      refreshLibrary: vi.fn(),
      uploadFiles: vi.fn(),
      removePortfolioById: vi.fn(),
      renamePortfolio: vi.fn(),
    });

    renderWithProvider(<Home />);

    expect(screen.queryByTestId("portfolio-library-nav")).not.toBeInTheDocument();
  });
});
