import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPortfolioPersistenceForTests } from "@/lib/storage";
import { usePortfolioLibrary } from "../usePortfolioLibrary";

const VALID_HEADER =
  "Account Number,Account Name,Investment Type,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis Total,Average Cost Basis,Type";

function makeCSV(row: string): string {
  return [VALID_HEADER, row].join("\n");
}

describe("usePortfolioLibrary", () => {
  beforeEach(async () => {
    await resetPortfolioPersistenceForTests();
    vi.restoreAllMocks();
  });

  it("sets isLibraryLoading false after the initial library read", async () => {
    const { result } = renderHook(() => usePortfolioLibrary());

    expect(result.current.isLibraryLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.isLibraryLoading).toBe(false);
    });
  });

  it("uploads multiple files and keeps the parsed portfolios in the library", async () => {
    const { result } = renderHook(() => usePortfolioLibrary());

    const firstFile = new File(
      [
        makeCSV(
          "TEST-0001,Account A,Stocks,TSTA,SYNTHETIC ALPHA CORP,24,$50.00,+$0.50,$1200.00,+$12.00,+1.01%,+$240.00,+25.00%,12.00%,$960.00,$40.00,Cash,"
        ),
      ],
      "alpha.csv",
      { type: "text/csv" }
    );
    const secondFile = new File(
      [
        makeCSV(
          "TEST-0002,Account B,ETFs,FUNDX,SYNTHETIC MARKET FUND,40,$75.00,-$0.25,$3000.00,-$10.00,-0.33%,+$300.00,+11.11%,30.00%,$2700.00,$67.50,Cash,"
        ),
      ],
      "market.csv",
      { type: "text/csv" }
    );

    const uploadResult = await result.current.uploadFiles([firstFile, secondFile]);

    expect(uploadResult.failedUploads).toEqual([]);
    await result.current.refreshLibrary();
    await waitFor(() => {
      expect(result.current.portfolios).toHaveLength(2);
    });
    expect(result.current.portfolios.map(({ sourceFileName }) => sourceFileName)).toEqual([
      "market.csv",
      "alpha.csv",
    ]);
  });

  it("keeps successful uploads and reports invalid files", async () => {
    const { result } = renderHook(() => usePortfolioLibrary());

    const goodFile = new File(
      [
        makeCSV(
          "TEST-0001,Account A,Stocks,TSTA,SYNTHETIC ALPHA CORP,24,$50.00,+$0.50,$1200.00,+$12.00,+1.01%,+$240.00,+25.00%,12.00%,$960.00,$40.00,Cash,"
        ),
      ],
      "good.csv",
      { type: "text/csv" }
    );
    const badFile = new File(["not,a,fidelity,file"], "bad.csv", {
      type: "text/csv",
    });

    const uploadResult = await result.current.uploadFiles([goodFile, badFile]);

    expect(uploadResult.uploadedPortfolios).toHaveLength(1);
    expect(uploadResult.failedUploads).toEqual([
      expect.objectContaining({ fileName: "bad.csv" }),
    ]);
    await result.current.refreshLibrary();
    await waitFor(() => {
      expect(result.current.portfolios).toHaveLength(1);
      expect(result.current.error).toMatch(/bad\.csv/i);
    });
  });

  it("does not refresh portfolios until refreshLibrary runs", async () => {
    const { result } = renderHook(() => usePortfolioLibrary());

    await waitFor(() => {
      expect(result.current.portfolios).toEqual([]);
    });

    const file = new File(
      [
        makeCSV(
          "TEST-0001,Account A,Stocks,TSTA,SYNTHETIC ALPHA CORP,24,$50.00,+$0.50,$1200.00,+$12.00,+1.01%,+$240.00,+25.00%,12.00%,$960.00,$40.00,Cash,"
        ),
      ],
      "solo.csv",
      { type: "text/csv" }
    );

    const uploadResult = await result.current.uploadFiles([file]);

    expect(uploadResult.uploadedPortfolios).toHaveLength(1);
    expect(result.current.portfolios).toEqual([]);

    await result.current.refreshLibrary();
    await waitFor(() => {
      expect(result.current.portfolios).toHaveLength(1);
    });
  });
});
