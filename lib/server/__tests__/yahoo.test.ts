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
    mockQuoteSummary.mockResolvedValue({
      topHoldings: {
        holdings: [
          {
            symbol: "IXUS",
            holdingName: "iShares Core MSCI Total Intl Stk ETF",
            holdingPercent: 0.3753278,
          },
        ],
      },
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
        symbol: "IXUS",
        holdingName: "iShares Core MSCI Total Intl Stk ETF",
        holdingPercent: 0.3753278,
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
