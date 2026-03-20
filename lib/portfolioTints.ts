import { hashString } from "./utils";

/** Must match `--portfolio-tint-0` … `--portfolio-tint-${COUNT-1}` in `app/globals.css`. */
export const PORTFOLIO_TINT_COUNT = 8;

export function pickRandomPortfolioTintIndex(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! % PORTFOLIO_TINT_COUNT;
  }
  return Math.floor(Math.random() * PORTFOLIO_TINT_COUNT);
}

export function resolvePortfolioTintIndex(portfolio: {
  id: string;
  tintIndex?: number;
}): number {
  const { tintIndex } = portfolio;
  if (
    typeof tintIndex === "number" &&
    tintIndex >= 0 &&
    tintIndex < PORTFOLIO_TINT_COUNT
  ) {
    return tintIndex;
  }
  return hashString(portfolio.id, PORTFOLIO_TINT_COUNT);
}
