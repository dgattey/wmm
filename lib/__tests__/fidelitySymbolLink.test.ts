import {
  isFidelityLinkable,
  getFidelityQuoteUrl,
} from "../fidelitySymbolLink";

describe("fidelitySymbolLink", () => {
  describe("isFidelityLinkable", () => {
    it("links stocks", () => {
      expect(isFidelityLinkable("AAPL")).toBe(true);
      expect(isFidelityLinkable("MSFT")).toBe(true);
      expect(isFidelityLinkable("GOOGL")).toBe(true);
    });

    it("links ETFs", () => {
      expect(isFidelityLinkable("SPY")).toBe(true);
      expect(isFidelityLinkable("VTI")).toBe(true);
      expect(isFidelityLinkable("QQQ")).toBe(true);
    });

    it("links mutual funds with standard tickers", () => {
      expect(isFidelityLinkable("FXAIX")).toBe(true);
      expect(isFidelityLinkable("VTSAX")).toBe(true);
    });

    it("links symbols with hyphen (BRK-B)", () => {
      expect(isFidelityLinkable("BRK-B")).toBe(true);
    });

    it("does NOT link numeric-prefixed symbols (incl. some intl tickers)", () => {
      // 401k IDs and some international tickers (6501.T, 0700.HK) - skip to be safe
      expect(isFidelityLinkable("6501.T")).toBe(false);
      expect(isFidelityLinkable("0700.HK")).toBe(false);
    });

    it("does NOT link cash/money market", () => {
      expect(isFidelityLinkable("FZFXX")).toBe(false);
      expect(isFidelityLinkable("FDRXX")).toBe(false);
      expect(isFidelityLinkable("SPAXX")).toBe(false);
    });

    it("does NOT link 401k internal IDs", () => {
      expect(isFidelityLinkable("900000001")).toBe(false);
      expect(isFidelityLinkable("12345")).toBe(false);
    });

    it("does NOT link malformed symbols", () => {
      expect(isFidelityLinkable("ABC DEF")).toBe(false);
      expect(isFidelityLinkable("")).toBe(false);
      expect(isFidelityLinkable("TOO-LONG-SYMBOL-123")).toBe(false);
    });
  });

  describe("getFidelityQuoteUrl", () => {
    it("builds correct URL", () => {
      expect(getFidelityQuoteUrl("AAPL")).toBe(
        "https://digital.fidelity.com/prgw/digital/research/quote?symbol=AAPL"
      );
      expect(getFidelityQuoteUrl("BRK-B")).toContain("symbol=BRK-B");
    });
  });
});
