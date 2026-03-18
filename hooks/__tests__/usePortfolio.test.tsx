import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FidelityPosition, PortfolioData } from "@/lib/types";
import { savePortfolio, savePortfolioData } from "@/lib/storage";
import { usePortfolio } from "../usePortfolio";

const positions: FidelityPosition[] = [
  {
    accountNumber: "TEST-0001",
    accountName: "Account A",
    investmentType: "Stocks",
    symbol: "ASSET-A",
    description: "Synthetic Asset A",
    quantity: 12,
    lastPrice: 50,
    lastPriceChange: 1,
    currentValue: 600,
    todayGainLossDollar: 12,
    todayGainLossPercent: 2,
    totalGainLossDollar: 120,
    totalGainLossPercent: 25,
    percentOfAccount: 100,
    costBasisTotal: 480,
    averageCostBasis: 40,
    type: "Equity",
  },
];

const cachedData: PortfolioData = {
  treeMapNodes: [],
  tableRows: [],
  positionRows: [],
  summary: {
    totalValue: 600,
    totalGainLoss: 120,
    totalGainLossPercent: 25,
    accounts: ["Account A"],
    investmentTypes: ["Stocks"],
  },
  lastUpdated: "2026-03-18T00:00:00.000Z",
};

const refreshedData: PortfolioData = {
  ...cachedData,
  summary: {
    ...cachedData.summary,
    totalValue: 720,
    totalGainLoss: 180,
    totalGainLossPercent: 33.33,
  },
  lastUpdated: "2026-03-18T00:05:00.000Z",
};

describe("usePortfolio startup cache restore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.hasData).toBe(true);
      expect(result.current.portfolioData).toEqual(cachedData);
      expect(result.current.restoredFromStorage).toBe(true);
    });

    expect(result.current.isLoading).toBe(true);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
