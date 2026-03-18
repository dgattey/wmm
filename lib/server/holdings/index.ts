import type { FundHolding } from "@/lib/types";
import { fetchSecNportHoldings } from "./secNport";

export interface HoldingsProviderRequest {
  symbol: string;
  description?: string;
  fetchYahooHoldings: (symbol: string) => Promise<FundHolding[]>;
}

export async function fetchDirectFundHoldings({
  symbol,
  description,
  fetchYahooHoldings,
}: HoldingsProviderRequest): Promise<FundHolding[]> {
  const secHoldings = await fetchSecNportHoldings(symbol, description);
  if (secHoldings && secHoldings.length > 0) {
    return secHoldings;
  }

  return fetchYahooHoldings(symbol);
}
