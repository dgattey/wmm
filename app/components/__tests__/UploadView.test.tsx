import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}));

import { UploadView } from "../UploadView";

describe("UploadView", () => {
  it("renders the title and instructions", () => {
    render(<UploadView onFilesSelect={vi.fn()} />);
    expect(screen.getByText("Add portfolios")).toBeInTheDocument();
    expect(
      screen.getByText("Import one or more Fidelity exports for the picker.")
    ).toBeInTheDocument();
  });

  it("shows the upload preview card without icon-specific copy", () => {
    render(<UploadView onFilesSelect={vi.fn()} />);
    expect(screen.getByAltText("Portfolio preview graphic")).toBeInTheDocument();
    expect(screen.getByText("Import your positions CSV")).toBeInTheDocument();
    expect(
      screen.getByText("Upload one or more Fidelity exports to build a saved library.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/favicon/i)).not.toBeInTheDocument();
  });

  it("renders all three instruction steps", () => {
    render(<UploadView onFilesSelect={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByLabelText("More actions menu")).toBeInTheDocument();
    expect(screen.getByText(/menu on the right/i)).toHaveTextContent(
      "Open the menu on the right, then click Download to export your positions as CSV"
    );
  });

  it("renders a link to Fidelity Positions", () => {
    render(<UploadView onFilesSelect={vi.fn()} />);
    const link = screen.getByRole("link", { name: /fidelity positions/i });
    expect(link).toHaveAttribute(
      "href",
      "https://digital.fidelity.com/ftgw/digital/portfolio/positions"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows drop zone text in default state", () => {
    render(<UploadView onFilesSelect={vi.fn()} />);
    expect(screen.getByText("Drag & drop CSVs or click to browse")).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading", () => {
    render(<UploadView onFilesSelect={vi.fn()} isLoading />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.queryByText("Drag & drop CSVs or click to browse")).not.toBeInTheDocument();
  });

  it("shows error message when error prop provided", () => {
    render(
      <UploadView onFilesSelect={vi.fn()} error="Something went wrong" />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("does not show error when no error", () => {
    render(<UploadView onFilesSelect={vi.fn()} />);
    expect(
      screen.queryByText("Something went wrong")
    ).not.toBeInTheDocument();
  });

  it("calls onFilesSelect when files are selected via input", () => {
    const onFilesSelect = vi.fn();
    render(<UploadView onFilesSelect={onFilesSelect} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File(["test content"], "test.csv", {
      type: "text/csv",
    });
    const anotherFile = new File(["other content"], "other.csv", {
      type: "text/csv",
    });
    fireEvent.change(input, { target: { files: [file, anotherFile] } });
    expect(onFilesSelect).toHaveBeenCalledWith([file, anotherFile]);
  });

  it("accepts multiple .csv files", () => {
    render(<UploadView onFilesSelect={vi.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toHaveAttribute("accept", ".csv,text/csv");
    expect(input).toHaveAttribute("multiple");
  });
});
