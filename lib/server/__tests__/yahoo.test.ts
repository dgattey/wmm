import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuote = vi.fn();
const mockQuoteSummary = vi.fn();
const mockSearch = vi.fn();

vi.mock("yahoo-finance2", () => {
  class MockYahooFinance {
    quote = mockQuote;
    quoteSummary = mockQuoteSummary;
    search = mockSearch;
  }

  return {
    default: MockYahooFinance,
  };
});

describe("shouldSkipYahooSymbol", () => {
  it("keeps exchange-qualified numeric symbols fetchable", async () => {
    const { shouldSkipYahooSymbol } = await import("../yahoo");

    expect(shouldSkipYahooSymbol("6501.T")).toBe(false);
    expect(shouldSkipYahooSymbol("8316.T")).toBe(false);
    expect(shouldSkipYahooSymbol("0700.HK")).toBe(false);
  });

  it("skips likely internal non-market identifiers", async () => {
    const { shouldSkipYahooSymbol } = await import("../yahoo");

    expect(shouldSkipYahooSymbol("12345")).toBe(true);
    expect(shouldSkipYahooSymbol("09261F572")).toBe(true);
  });

  it("skips malformed symbols", async () => {
    const { shouldSkipYahooSymbol } = await import("../yahoo");

    expect(shouldSkipYahooSymbol("ABC DEF")).toBe(true);
    expect(shouldSkipYahooSymbol("TOO-LONG-SYMBOL-123")).toBe(true);
  });
});

describe("yahoo fund symbol lookups", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuote.mockReset();
    mockQuoteSummary.mockReset();
    mockSearch.mockReset();
  });

  it("automatically resolves a public proxy share class from description", async () => {
    mockSearch
      .mockResolvedValueOnce({ quotes: [] })
      .mockResolvedValueOnce({
        quotes: [
          {
            symbol: "LIVKX",
            longname: "BlackRock LifePath Index 2055 K",
            shortname: "BlackRock LifePath Index 2055",
            quoteType: "MUTUALFUND",
          },
        ],
      });
    mockQuoteSummary.mockImplementation(async (symbol: string) => {
      if (symbol === "LIVKX") {
        return {
          topHoldings: {
            holdings: [
              {
                symbol: "IXUS",
                holdingName: "iShares Core MSCI Total Intl Stk ETF",
                holdingPercent: 0.3753278,
              },
            ],
          },
        };
      }

      return {};
    });

    const { fetchAllHoldings } = await import("../yahoo");
    const result = await fetchAllHoldings([
      { symbol: "09261F572", description: "BTC LPATH IDX 2055 M" },
    ]);

    expect(mockSearch).toHaveBeenNthCalledWith(1, "BTC LIFEPATH INDEX 2055");
    expect(mockSearch).toHaveBeenNthCalledWith(2, "LIFEPATH INDEX 2055");
    expect(mockQuoteSummary).toHaveBeenCalledWith("LIVKX", {
      modules: ["topHoldings"],
    });
    expect(result["09261F572"]).toEqual([
      {
        symbol: "09261F572",
        holdingName: "Rest of BTC LPATH IDX 2055 M",
        holdingPercent: 0.6246722,
      },
      {
        symbol: "IXUS",
        holdingName: "iShares Core MSCI Total Intl Stk ETF",
        holdingPercent: 0.3753278,
      },
    ]);
  });

  it("looks through one extra fund layer and keeps any unreported remainder", async () => {
    mockQuoteSummary.mockImplementation(async (symbol: string) => {
      if (symbol === "TARGET") {
        return {
          topHoldings: {
            holdings: [
              {
                symbol: "IXUS",
                holdingName: "iShares Core MSCI Total Intl Stk ETF",
                holdingPercent: 0.6,
              },
              {
                symbol: "CASHX",
                holdingName: "Cash Sleeve",
                holdingPercent: 0.3,
              },
            ],
          },
        };
      }

      if (symbol === "IXUS") {
        return {
          topHoldings: {
            holdings: [
              {
                symbol: "2330.TW",
                holdingName: "Taiwan Semiconductor Manufacturing Co Ltd",
                holdingPercent: 0.5,
              },
              {
                symbol: "005930.KS",
                holdingName: "Samsung Electronics Co Ltd",
                holdingPercent: 0.25,
              },
            ],
          },
        };
      }

      return {};
    });

    const { fetchAllHoldings } = await import("../yahoo");
    const result = await fetchAllHoldings([{ symbol: "TARGET" }]);

    expect(result.TARGET.map(({ symbol, holdingName }) => ({ symbol, holdingName }))).toEqual([
      {
        symbol: "2330.TW",
        holdingName: "Taiwan Semiconductor Manufacturing Co Ltd",
      },
      {
        symbol: "CASHX",
        holdingName: "Cash Sleeve",
      },
      {
        symbol: "005930.KS",
        holdingName: "Samsung Electronics Co Ltd",
      },
      {
        symbol: "IXUS",
        holdingName: "Rest of iShares Core MSCI Total Intl Stk ETF",
      },
      {
        symbol: "TARGET",
        holdingName: "Rest of TARGET",
      },
    ]);
    expect(result.TARGET[0]?.holdingPercent).toBeCloseTo(0.3);
    expect(result.TARGET[1]?.holdingPercent).toBeCloseTo(0.3);
    expect(result.TARGET[2]?.holdingPercent).toBeCloseTo(0.15);
    expect(result.TARGET[3]?.holdingPercent).toBeCloseTo(0.15);
    expect(result.TARGET[4]?.holdingPercent).toBeCloseTo(0.1);
    expect(
      result.TARGET.reduce((sum, holding) => sum + holding.holdingPercent, 0)
    ).toBeCloseTo(1);
  });

  it("still skips quote lookups for internal non-market symbols", async () => {
    const { fetchQuotes } = await import("../yahoo");
    const result = await fetchQuotes(["09261F572"]);

    expect(mockQuote).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
