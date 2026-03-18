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
    expect(shouldSkipYahooSymbol("900000001")).toBe(true);
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
            symbol: "ALPKX",
            longname: "Alpha LifePath Index 2055 K",
            shortname: "Alpha LifePath Index 2055",
            quoteType: "MUTUALFUND",
          },
        ],
      });
    mockQuoteSummary.mockImplementation(async (symbol: string) => {
      if (symbol === "ALPKX") {
        return {
          topHoldings: {
            holdings: [
              {
                symbol: "ETFQ",
                holdingName: "Synthetic International Equity ETF",
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
      { symbol: "900000001", description: "ALP LPATH IDX 2055 M" },
    ]);

    expect(mockSearch).toHaveBeenNthCalledWith(1, "ALP LIFEPATH INDEX 2055");
    expect(mockSearch).toHaveBeenNthCalledWith(2, "LIFEPATH INDEX 2055");
    expect(mockQuoteSummary).toHaveBeenCalledWith("ALPKX", {
      modules: ["topHoldings"],
    });
    expect(result["900000001"]).toEqual([
      {
        symbol: "900000001",
        holdingName: "Rest of ALP LPATH IDX 2055 M",
        holdingPercent: 0.6246722,
      },
      {
        symbol: "ETFQ",
        holdingName: "Synthetic International Equity ETF",
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
                symbol: "ETFQ",
                holdingName: "Synthetic International Equity ETF",
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

      if (symbol === "ETFQ") {
        return {
          topHoldings: {
            holdings: [
              {
                symbol: "EQTY1.TW",
                holdingName: "Synthetic Asia Equity",
                holdingPercent: 0.5,
              },
              {
                symbol: "EQTY2.KS",
                holdingName: "Synthetic Korea Equity",
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
        symbol: "EQTY1.TW",
        holdingName: "Synthetic Asia Equity",
      },
      {
        symbol: "CASHX",
        holdingName: "Cash Sleeve",
      },
      {
        symbol: "EQTY2.KS",
        holdingName: "Synthetic Korea Equity",
      },
      {
        symbol: "ETFQ",
        holdingName: "Rest of Synthetic International Equity ETF",
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

  it("uses Yahoo top holdings for direct fund lookups", async () => {
    mockQuoteSummary.mockResolvedValueOnce({
      topHoldings: {
        holdings: [
          {
            symbol: "EQTYA",
            holdingName: "Synthetic Equity A",
            holdingPercent: 0.12,
          },
        ],
      },
    });

    const { fetchAllHoldings } = await import("../yahoo");
    const result = await fetchAllHoldings([{ symbol: "ALPKX" }]);

    expect(mockQuoteSummary).toHaveBeenCalledWith("ALPKX", {
      modules: ["topHoldings"],
    });
    expect(result.ALPKX).toEqual([
      {
        symbol: "ALPKX",
        holdingName: "Rest of ALPKX",
        holdingPercent: 0.88,
      },
      {
        symbol: "EQTYA",
        holdingName: "Synthetic Equity A",
        holdingPercent: 0.12,
      },
    ]);
  });

  it("passes proxy-resolved funds through the direct holdings lookup", async () => {
    mockSearch
      .mockResolvedValueOnce({ quotes: [] })
      .mockResolvedValueOnce({
        quotes: [
          {
            symbol: "ALPKX",
            longname: "Alpha LifePath Index 2055 K",
            shortname: "Alpha LifePath Index 2055",
            quoteType: "MUTUALFUND",
          },
        ],
      });
    mockQuoteSummary.mockResolvedValueOnce({
      topHoldings: {
        holdings: [
          {
            symbol: "ETFQ",
            holdingName: "Synthetic International Equity ETF",
            holdingPercent: 0.55,
          },
        ],
      },
    });

    const { fetchAllHoldings } = await import("../yahoo");
    const result = await fetchAllHoldings([
      { symbol: "900000001", description: "ALP LPATH IDX 2055 M" },
    ]);

    expect(mockQuoteSummary).toHaveBeenCalledWith("ALPKX", {
      modules: ["topHoldings"],
    });
    expect(result["900000001"]).toHaveLength(2);
    expect(result["900000001"][0]).toMatchObject({
      symbol: "ETFQ",
      holdingName: "Synthetic International Equity ETF",
    });
    expect(result["900000001"][0]?.holdingPercent).toBeCloseTo(0.55);
    expect(result["900000001"][1]).toMatchObject({
      symbol: "900000001",
      holdingName: "Rest of ALP LPATH IDX 2055 M",
    });
    expect(result["900000001"][1]?.holdingPercent).toBeCloseTo(0.45);
  });

  it("still skips quote lookups for internal non-market symbols", async () => {
    const { fetchQuotes } = await import("../yahoo");
    const result = await fetchQuotes(["900000001"]);

    expect(mockQuote).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
