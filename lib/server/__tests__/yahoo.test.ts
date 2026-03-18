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
        holdingName: "BTC LPATH IDX 2055 M",
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

    expect(result.TARGET).toEqual([
      {
        symbol: "2330.TW",
        holdingName: "Taiwan Semiconductor Manufacturing Co Ltd",
        holdingPercent: 0.3,
      },
      {
        symbol: "CASHX",
        holdingName: "Cash Sleeve",
        holdingPercent: 0.3,
      },
      {
        symbol: "005930.KS",
        holdingName: "Samsung Electronics Co Ltd",
        holdingPercent: 0.15,
      },
      {
        symbol: "IXUS",
        holdingName: "iShares Core MSCI Total Intl Stk ETF",
        holdingPercent: 0.15,
      },
      {
        symbol: "TARGET",
        holdingName: "TARGET",
        holdingPercent: 0.1,
      },
    ]);
  });

  it("still skips quote lookups for internal non-market symbols", async () => {
    const { fetchQuotes } = await import("../yahoo");
    const result = await fetchQuotes(["09261F572"]);

    expect(mockQuote).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
