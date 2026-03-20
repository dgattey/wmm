import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetPortfolioPersistenceForTests,
  saveStoredPortfolioData,
  saveUploadedPortfolio,
} from "@/lib/storage";
import type { FidelityPosition, PortfolioData } from "@/lib/types";
import { useStoredPortfolioRecord } from "../useStoredPortfolioRecord";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

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

describe("useStoredPortfolioRecord", () => {
  beforeEach(async () => {
    await resetPortfolioPersistenceForTests();
    vi.restoreAllMocks();
  });

  it("restores cached data before refreshing the active portfolio", async () => {
    const summary = await saveUploadedPortfolio({
      sourceFileName: "account-a.csv",
      positions,
    });
    await saveStoredPortfolioData(summary.id, cachedData);

    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useStoredPortfolioRecord({
        portfolioId: summary.id,
        width: 1200,
        height: 400,
        layoutMode: "desktop",
      })
    );

    await waitFor(() => {
      expect(result.current.positions).toEqual(positions);
      expect(result.current.portfolioData).toEqual(cachedData);
      expect(result.current.restoredFromStorage).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positions,
        width: 1200,
        height: 400,
      }),
    });
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);

    resolveFetch?.(
      new Response(JSON.stringify(refreshedData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await waitFor(() => {
      expect(result.current.portfolioData).toEqual(refreshedData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it("keeps positions loaded when treemap dimensions change (no storage reload)", async () => {
    const summary = await saveUploadedPortfolio({
      sourceFileName: "account-a.csv",
      positions,
    });
    await saveStoredPortfolioData(summary.id, cachedData);

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(refreshedData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const { result, rerender } = renderHook(
      ({ width, height, layoutMode }: { width: number; height: number; layoutMode: "mobile" | "desktop" }) =>
        useStoredPortfolioRecord({
          portfolioId: summary.id,
          width,
          height,
          layoutMode,
        }),
      {
        initialProps: {
          width: 1200,
          height: 400,
          layoutMode: "desktop",
        },
      }
    );

    await waitFor(() => {
      expect(result.current.positions).toEqual(positions);
    });

    const scrollCallsBeforeResize = vi.mocked(window.scrollTo).mock.calls.length;

    rerender({ width: 720, height: 640, layoutMode: "mobile" });

    expect(result.current.isMissing).toBe(false);
    expect(result.current.positions).toEqual(positions);
    expect(vi.mocked(window.scrollTo).mock.calls.length).toBe(scrollCallsBeforeResize);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
      const refreshCall = calls.find((call) => call[0] === "/api/portfolio/refresh");
      expect(refreshCall).toBeDefined();
      const [, init] = refreshCall!;
      expect(typeof init.body).toBe("string");
      expect(JSON.parse(init.body as string)).toMatchObject({
        width: 720,
        height: 640,
      });
    });
  });
});
