import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuote = vi.fn();
const mockQuoteSummary = vi.fn();

vi.mock("yahoo-finance2", () => {
  class MockYahooFinance {
    quote = mockQuote;
    quoteSummary = mockQuoteSummary;
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
  });

  it("uses a public proxy share class for internal 401k fund holdings", async () => {
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
    const result = await fetchAllHoldings(["09261F572"]);

    expect(mockQuoteSummary).toHaveBeenCalledWith("LIVIX", {
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
