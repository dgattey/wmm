import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FidelityPosition, PortfolioData } from "@/lib/types";
import { usePortfolio } from "./usePortfolio";
import { savePortfolio, savePortfolioData } from "@/lib/storage";

const positions: FidelityPosition[] = [
  {
    accountNumber: "1234",
    accountName: "Brokerage",
    investmentType: "Stocks",
    symbol: "AAPL",
    description: "Apple Inc.",
    quantity: 10,
    lastPrice: 180,
    lastPriceChange: 1.2,
    currentValue: 1800,
    todayGainLossDollar: 12,
    todayGainLossPercent: 0.67,
    totalGainLossDollar: 400,
    totalGainLossPercent: 28.57,
    percentOfAccount: 100,
    costBasisTotal: 1400,
    averageCostBasis: 140,
    type: "Equity",
  },
];

const cachedData: PortfolioData = {
  treeMapNodes: [],
  tableRows: [],
  positionRows: [],
  summary: {
    totalValue: 1800,
    totalGainLoss: 400,
    totalGainLossPercent: 28.57,
    accounts: ["Brokerage"],
    investmentTypes: ["Stocks"],
  },
  lastUpdated: "2026-03-18T00:00:00.000Z",
};

const refreshedData: PortfolioData = {
  ...cachedData,
  summary: {
    ...cachedData.summary,
    totalValue: 1900,
    totalGainLoss: 500,
    totalGainLossPercent: 35.71,
  },
  lastUpdated: "2026-03-18T00:05:00.000Z",
};

describe("usePortfolio startup cache restore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("restores cached dashboard data before the refresh request finishes", async () => {
    savePortfolio(positions);
    savePortfolioData(cachedData);

    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.hasData).toBe(true);
      expect(result.current.portfolioData).toEqual(cachedData);
    });

    expect(result.current.isLoading).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positions,
        width: 1200,
        height: 400,
      }),
    });

    resolveFetch?.(
      new Response(JSON.stringify(refreshedData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await waitFor(() => {
      expect(result.current.portfolioData).toEqual(refreshedData);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
