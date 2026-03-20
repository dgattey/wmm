import { beforeEach, describe, expect, it } from "vitest";
import {
  getMostRecentPortfolioId,
  loadStoredPortfolio,
  removeStoredPortfolio,
  resetPortfolioPersistenceForTests,
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("portfolio storage", () => {
  beforeEach(async () => {
    await resetPortfolioPersistenceForTests();
  });

  it("stores portfolios newest-first and keeps only recent dashboard caches", async () => {
    const summaries: Awaited<ReturnType<typeof saveUploadedPortfolio>>[] = [];
    for (let index = 0; index < 4; index++) {
      await sleep(5);
      const summary = await saveUploadedPortfolio({
        sourceFileName: `portfolio-${index + 1}.csv`,
        positions: makePositions(`ASSET-${index + 1}`, 100 * (index + 1)),
      });
      await saveStoredPortfolioData(
        summary.id,
        makePortfolioData(
          100 * (index + 1),
          `2026-03-18T00:00:1${index}.000Z`
        )
      );
      summaries.push(summary);
    }

    expect((await listStoredPortfolios()).map(({ sourceFileName }) => sourceFileName)).toEqual([
      "portfolio-4.csv",
      "portfolio-3.csv",
      "portfolio-2.csv",
      "portfolio-1.csv",
    ]);
    expect((await loadStoredPortfolio(summaries[3].id))?.portfolioData).not.toBeNull();
    expect((await loadStoredPortfolio(summaries[2].id))?.portfolioData).not.toBeNull();
    expect((await loadStoredPortfolio(summaries[1].id))?.portfolioData).not.toBeNull();
    expect((await loadStoredPortfolio(summaries[0].id))?.portfolioData).toBeNull();
  });

  it("updates recency and returns the next available portfolio when removing", async () => {
    const first = await saveUploadedPortfolio({
      sourceFileName: "first.csv",
      positions: makePositions("ASSET-1", 100),
    });
    await sleep(5);
    const second = await saveUploadedPortfolio({
      sourceFileName: "second.csv",
      positions: makePositions("ASSET-2", 200),
    });
    await sleep(5);
    await touchStoredPortfolio(first.id);

    expect(await getMostRecentPortfolioId()).toBe(first.id);
    expect(await removeStoredPortfolio(first.id)).toBe(second.id);
    expect((await listStoredPortfolios()).map(({ id }) => id)).toEqual([second.id]);
  });
});
