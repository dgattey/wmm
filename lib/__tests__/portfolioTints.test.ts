import { describe, expect, it, vi } from "vitest";
import {
  PORTFOLIO_TINT_COUNT,
  pickRandomPortfolioTintIndex,
  resolvePortfolioTintIndex,
} from "../portfolioTints";

describe("resolvePortfolioTintIndex", () => {
  it("uses stored tintIndex when valid", () => {
    expect(
      resolvePortfolioTintIndex({ id: "abc", tintIndex: 3 })
    ).toBe(3);
  });

  it("ignores out-of-range tintIndex and falls back to id hash", () => {
    const a = resolvePortfolioTintIndex({ id: "same-id", tintIndex: -1 });
    const b = resolvePortfolioTintIndex({ id: "same-id", tintIndex: 99 });
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(PORTFOLIO_TINT_COUNT);
  });

  it("is stable for a given id when tintIndex is missing", () => {
    expect(resolvePortfolioTintIndex({ id: "portfolio-xyz" })).toBe(
      resolvePortfolioTintIndex({ id: "portfolio-xyz" })
    );
  });
});

describe("pickRandomPortfolioTintIndex", () => {
  it("returns an in-range index", () => {
    vi.spyOn(crypto, "getRandomValues").mockImplementation((arr) => {
      const view = arr as Uint32Array;
      view[0] = 1_200_000_047;
      return arr;
    });
    expect(pickRandomPortfolioTintIndex()).toBe(1_200_000_047 % PORTFOLIO_TINT_COUNT);
    vi.restoreAllMocks();
  });
});
