import { isFundInvestmentType } from "@/lib/investmentTypes";
import type {
  FidelityPosition,
  FundHolding,
  PortfolioData,
  QuoteData,
} from "@/lib/types";
import { computePortfolioData } from "./aggregation";
import { fetchQuotes, fetchAllHoldings } from "./yahoo";

const MAX_HOLDING_QUOTES = 250;

export async function buildPortfolioData(
  positions: FidelityPosition[],
  width: number,
  height: number
): Promise<PortfolioData> {
  const allSymbols = [...new Set(positions.map((position) => position.symbol))];
  const fundSymbols = positions
    .filter((position) => isFundInvestmentType(position.investmentType))
    .map((position) => ({
      symbol: position.symbol,
      description: position.description,
    }));
  const uniqueFundSymbols = Array.from(
    new Map(fundSymbols.map((fund) => [fund.symbol, fund])).values()
  );

  const [quotes, holdings] = await Promise.all([
    fetchQuotes(allSymbols),
    fetchAllHoldings(uniqueFundSymbols),
  ]);

  await hydrateHoldingQuotes(quotes, holdings, positions);

  return computePortfolioData(positions, quotes, holdings, width, height);
}

async function hydrateHoldingQuotes(
  quotes: Record<string, QuoteData>,
  holdings: Record<string, FundHolding[]>,
  positions: FidelityPosition[]
) {
  const fundValueBySymbol = new Map<string, number>();
  for (const position of positions) {
    fundValueBySymbol.set(
      position.symbol,
      (fundValueBySymbol.get(position.symbol) ?? 0) + position.currentValue
    );
  }

  const holdingSymbolScores = new Map<string, number>();

  for (const [fundSymbol, fundHoldings] of Object.entries(holdings)) {
    const fundValue = fundValueBySymbol.get(fundSymbol) ?? 0;
    for (const holding of fundHoldings) {
      if (!holding.symbol || quotes[holding.symbol]) continue;

      holdingSymbolScores.set(
        holding.symbol,
        (holdingSymbolScores.get(holding.symbol) ?? 0) + fundValue * holding.holdingPercent
      );
    }
  }

  if (holdingSymbolScores.size === 0) {
    return;
  }

  const prioritizedSymbols = [...holdingSymbolScores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, MAX_HOLDING_QUOTES)
    .map(([symbol]) => symbol);

  Object.assign(quotes, await fetchQuotes(prioritizedSymbols));
}
