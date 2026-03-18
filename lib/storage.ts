import type { FidelityPosition, PortfolioData } from "./types";

const PORTFOLIO_KEY = "portfolio_positions";
const PORTFOLIO_DATA_KEY = "portfolio_data";

/**
 * Save portfolio positions to localStorage.
 */
export function savePortfolio(positions: FidelityPosition[]): void {
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(positions));
  } catch {
    console.error("Failed to save portfolio to localStorage");
  }
}

/**
 * Load portfolio positions from localStorage.
 */
export function loadPortfolio(): FidelityPosition[] | null {
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as FidelityPosition[];
  } catch {
    return null;
  }
}

/**
 * Save the most recent computed portfolio dashboard payload.
 */
export function savePortfolioData(portfolioData: PortfolioData): void {
  try {
    localStorage.setItem(PORTFOLIO_DATA_KEY, JSON.stringify(portfolioData));
  } catch {
    console.error("Failed to save portfolio data to localStorage");
  }
}

/**
 * Load the last computed portfolio dashboard payload from localStorage.
 */
export function loadPortfolioData(): PortfolioData | null {
  try {
    const raw = localStorage.getItem(PORTFOLIO_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PortfolioData;
  } catch {
    return null;
  }
}

/**
 * Clear portfolio positions from localStorage.
 */
export function clearPortfolio(): void {
  try {
    localStorage.removeItem(PORTFOLIO_KEY);
    localStorage.removeItem(PORTFOLIO_DATA_KEY);
  } catch {
    console.error("Failed to clear portfolio from localStorage");
  }
}
