import { NextResponse } from "next/server";
import type { FidelityPosition } from "@/lib/types";
import { fetchQuotes, fetchAllHoldings } from "@/lib/server/yahoo";
import { computePortfolioData } from "@/lib/server/aggregation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const positions: FidelityPosition[] = body.positions;
    const width: number = body.width || 1200;
    const height: number = body.height || 400;

    if (!Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json(
        { error: "No positions provided" },
        { status: 400 }
      );
    }

    // Extract unique symbols
    const allSymbols = [...new Set(positions.map((p) => p.symbol))];

    // Identify fund symbols that need holdings data
    const fundSymbols = positions
      .filter(
        (p) =>
          p.investmentType === "ETFs" ||
          p.investmentType === "Mutual Funds" ||
          p.investmentType === "Others"
      )
      .map((p) => ({ symbol: p.symbol, description: p.description }));
    const uniqueFundSymbols = Array.from(
      new Map(fundSymbols.map((fund) => [fund.symbol, fund])).values()
    );

    // Fetch quotes and holdings in parallel
    const [quotes, holdings] = await Promise.all([
      fetchQuotes(allSymbols),
      fetchAllHoldings(uniqueFundSymbols),
    ]);

    // Also fetch quotes for underlying holdings symbols
    const holdingSymbols = new Set<string>();
    for (const fundHoldings of Object.values(holdings)) {
      for (const h of fundHoldings) {
        if (h.symbol && !quotes[h.symbol]) {
          holdingSymbols.add(h.symbol);
        }
      }
    }
    if (holdingSymbols.size > 0) {
      const holdingQuotes = await fetchQuotes([...holdingSymbols]);
      Object.assign(quotes, holdingQuotes);
    }

    // Compute full portfolio data
    const portfolioData = computePortfolioData(
      positions,
      quotes,
      holdings,
      width,
      height
    );

    return NextResponse.json(portfolioData);
  } catch (error) {
    console.error("Portfolio API error:", error);
    return NextResponse.json(
      {
        error: "Failed to compute portfolio data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
