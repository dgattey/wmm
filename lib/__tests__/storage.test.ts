import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PORTFOLIO_STORE_KEY = "portfolio_store";
import {
  getMostRecentPortfolioId,
  loadStoredPortfolio,
  removeStoredPortfolio,
  saveStoredPortfolioData,
  saveUploadedPortfolio,
  touchStoredPortfolio,
  listStoredPortfolios,
} from "../storage";
import type { FidelityPosition, PortfolioData } from "../types";

function makePositions(symbol: string, currentValue: number): FidelityPosition[] {
  return [
    {
      accountNumber: "TEST-0001",
      accountName: "Account A",
      investmentType: "Stocks",
      symbol,
      description: `${symbol} Holding`,
      quantity: 1,
      lastPrice: currentValue,
      lastPriceChange: 0,
      currentValue,
      todayGainLossDollar: 0,
      todayGainLossPercent: 0,
      totalGainLossDollar: 10,
      totalGainLossPercent: 10,
      percentOfAccount: 100,
      costBasisTotal: currentValue - 10,
      averageCostBasis: currentValue - 10,
      type: "Equity",
    },
  ];
}

function makePortfolioData(
  totalValue: number,
  lastUpdated: string
): PortfolioData {
  return {
    treeMapNodes: [],
    tableRows: [],
    positionRows: [],
    summary: {
      totalValue,
      totalGainLoss: 10,
      totalGainLossPercent: 10,
      accounts: ["Account A"],
      investmentTypes: ["Stocks"],
    },
    lastUpdated,
  };
}

describe("portfolio storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores portfolios newest-first and keeps only recent dashboard caches", () => {
    const summaries = Array.from({ length: 4 }, (_, index) => {
      vi.setSystemTime(new Date(`2026-03-18T00:00:0${index}.000Z`));
      const summary = saveUploadedPortfolio({
        sourceFileName: `portfolio-${index + 1}.csv`,
        positions: makePositions(`ASSET-${index + 1}`, 100 * (index + 1)),
      });
      vi.setSystemTime(new Date(`2026-03-18T00:00:1${index}.000Z`));
      saveStoredPortfolioData(
        summary.id,
        makePortfolioData(100 * (index + 1), `2026-03-18T00:00:1${index}.000Z`)
      );
      return summary;
    });

    expect(listStoredPortfolios().map(({ sourceFileName }) => sourceFileName)).toEqual([
      "portfolio-4.csv",
      "portfolio-3.csv",
      "portfolio-2.csv",
      "portfolio-1.csv",
    ]);
    expect(loadStoredPortfolio(summaries[3].id)?.portfolioData).not.toBeNull();
    expect(loadStoredPortfolio(summaries[2].id)?.portfolioData).not.toBeNull();
    expect(loadStoredPortfolio(summaries[1].id)?.portfolioData).not.toBeNull();
    expect(loadStoredPortfolio(summaries[0].id)?.portfolioData).toBeNull();
  });

  it("updates recency and returns the next available portfolio when removing", () => {
    const first = saveUploadedPortfolio({
      sourceFileName: "first.csv",
      positions: makePositions("ASSET-1", 100),
    });
    vi.setSystemTime(new Date("2026-03-18T00:05:00.000Z"));
    const second = saveUploadedPortfolio({
      sourceFileName: "second.csv",
      positions: makePositions("ASSET-2", 200),
    });
    vi.setSystemTime(new Date("2026-03-18T00:10:00.000Z"));
    touchStoredPortfolio(first.id);

    expect(getMostRecentPortfolioId()).toBe(first.id);
    expect(removeStoredPortfolio(first.id)).toBe(second.id);
    expect(listStoredPortfolios().map(({ id }) => id)).toEqual([second.id]);
  });

  it("rewrites legacy portfolio-* timestamp ids when reading the store", () => {
    const legacyId = "portfolio-1773946370314-jrc71e";
    localStorage.setItem(
      PORTFOLIO_STORE_KEY,
      JSON.stringify({
        version: 1,
        portfolios: [
          {
            id: legacyId,
            name: "Migrated",
            sourceFileName: "test.csv",
            uploadedAt: "2026-03-18T00:00:00.000Z",
            lastViewedAt: "2026-03-18T00:00:00.000Z",
            positionCount: 1,
            positions: makePositions("AAPL", 100),
            portfolioData: null,
          },
        ],
      })
    );

    vi.spyOn(crypto, "getRandomValues").mockImplementation((buffer) => {
      const arr = buffer as Uint8Array;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i % 256;
      }
      return arr;
    });

    const [summary] = listStoredPortfolios();
    expect(summary.id).not.toBe(legacyId);
    expect(summary.id).toMatch(/^[0-9a-z]{12}$/);
    expect(loadStoredPortfolio(summary.id)?.positions).toHaveLength(1);

    const roundTrip = JSON.parse(localStorage.getItem(PORTFOLIO_STORE_KEY)!);
    expect(roundTrip.portfolios[0].id).toBe(summary.id);
    expect(roundTrip.version).toBe(2);

    vi.restoreAllMocks();
  });
});
