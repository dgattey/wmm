import { describe, it, expect } from "vitest";
import {
  formatDollar,
  formatPercent,
  formatPrice,
  formatCompact,
  formatHeaderCurrency,
  cn,
  hashString,
} from "../utils";

describe("formatDollar", () => {
  it("formats positive values", () => {
    expect(formatDollar(1234.56)).toBe("$1,234.56");
  });

  it("formats negative values with minus before $", () => {
    expect(formatDollar(-500.1)).toBe("-$500.10");
  });

  it("formats zero", () => {
    expect(formatDollar(0)).toBe("$0.00");
  });

  it("handles non-finite", () => {
    expect(formatDollar(Infinity)).toBe("$0.00");
    expect(formatDollar(NaN)).toBe("$0.00");
  });

  it("formats large values with commas", () => {
    expect(formatDollar(1234567.89)).toBe("$1,234,567.89");
  });
});

describe("formatPercent", () => {
  it("formats positive with + sign", () => {
    expect(formatPercent(12.345)).toBe("+12.35%");
  });

  it("formats negative without extra sign", () => {
    expect(formatPercent(-5.678)).toBe("-5.68%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("handles non-finite", () => {
    expect(formatPercent(NaN)).toBe("0.00%");
  });
});

describe("formatPrice", () => {
  it("formats a price with dollar sign", () => {
    expect(formatPrice(123.45)).toBe("$123.45");
  });

  it("handles non-finite", () => {
    expect(formatPrice(Infinity)).toBe("$0.00");
  });
});

describe("formatCompact", () => {
  it("formats millions", () => {
    expect(formatCompact(1_500_000)).toBe("$1.5M");
  });

  it("formats thousands", () => {
    expect(formatCompact(45_300)).toBe("$45.3K");
  });

  it("formats small numbers", () => {
    expect(formatCompact(892)).toBe("$892");
  });

  it("formats negative", () => {
    expect(formatCompact(-1_200_000)).toBe("-$1.2M");
  });

  it("handles non-finite", () => {
    expect(formatCompact(NaN)).toBe("$0");
  });
});

describe("formatHeaderCurrency", () => {
  it("formats millions with extra precision", () => {
    expect(formatHeaderCurrency(2_248_626.48)).toBe("$2.25M");
  });

  it("formats larger thousands without decimals", () => {
    expect(formatHeaderCurrency(761_651.52)).toBe("$761k");
  });

  it("formats negative values", () => {
    expect(formatHeaderCurrency(-9_420)).toBe("-$9.4k");
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("returns empty string for no truthy values", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("hashString", () => {
  it("returns deterministic results", () => {
    const a = hashString("AAPL", 10);
    const b = hashString("AAPL", 10);
    expect(a).toBe(b);
  });

  it("returns values within bounds", () => {
    const val = hashString("some-string", 14);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(14);
  });

  it("produces different values for different strings", () => {
    const a = hashString("AAPL", 100);
    const b = hashString("MSFT", 100);
    expect(a).not.toBe(b);
  });
});
