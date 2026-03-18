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
    render(<UploadView onFileSelect={vi.fn()} />);
    expect(screen.getByText("Portfolio Allocation")).toBeInTheDocument();
    expect(
      screen.getByText("Visualize your investment portfolio breakdown")
    ).toBeInTheDocument();
  });

  it("shows the upload preview card without icon-specific copy", () => {
    render(<UploadView onFileSelect={vi.fn()} />);
    expect(screen.getByAltText("Portfolio preview graphic")).toBeInTheDocument();
    expect(screen.getByText("Import your positions CSV")).toBeInTheDocument();
    expect(
      screen.getByText("Upload your Fidelity export to load the portfolio view.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/favicon/i)).not.toBeInTheDocument();
  });

  it("renders all three instruction steps", () => {
    render(<UploadView onFileSelect={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders a link to Fidelity Positions", () => {
    render(<UploadView onFileSelect={vi.fn()} />);
    const link = screen.getByRole("link", { name: /fidelity positions/i });
    expect(link).toHaveAttribute(
      "href",
      "https://digital.fidelity.com/ftgw/digital/portfolio/positions"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows drop zone text in default state", () => {
    render(<UploadView onFileSelect={vi.fn()} />);
    expect(
      screen.getByText("Drag & drop CSV or click to browse")
    ).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading", () => {
    render(<UploadView onFileSelect={vi.fn()} isLoading />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(
      screen.queryByText("Drag & drop CSV or click to browse")
    ).not.toBeInTheDocument();
  });

  it("shows error message when error prop provided", () => {
    render(
      <UploadView onFileSelect={vi.fn()} error="Something went wrong" />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("does not show error when no error", () => {
    render(<UploadView onFileSelect={vi.fn()} />);
    expect(
      screen.queryByText("Something went wrong")
    ).not.toBeInTheDocument();
  });

  it("calls onFileSelect when a file is selected via input", () => {
    const onFileSelect = vi.fn();
    render(<UploadView onFileSelect={onFileSelect} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File(["test content"], "test.csv", {
      type: "text/csv",
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it("accepts .csv files", () => {
    render(<UploadView onFileSelect={vi.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toHaveAttribute("accept", ".csv,text/csv");
  });
});
