import type { FidelityPosition, PortfolioData } from "./types";

interface FetchPortfolioDataInput {
  positions: FidelityPosition[];
  endpoint: string;
  width: number;
  height: number;
}

export async function fetchPortfolioData({
  positions,
  endpoint,
  width,
  height,
}: FetchPortfolioDataInput): Promise<PortfolioData> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      positions,
      width,
      height,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getFetchErrorMessage(payload, response.status));
  }

  return response.json() as Promise<PortfolioData>;
}

function getFetchErrorMessage(
  payload: { error?: unknown; details?: unknown },
  status: number
): string {
  const error =
    typeof payload.error === "string" && payload.error.trim().length > 0
      ? payload.error.trim()
      : `Server error: ${status}`;
  const details =
    typeof payload.details === "string" && payload.details.trim().length > 0
      ? payload.details.trim()
      : null;

  if (!details || details === error) {
    return error;
  }

  return `${error}: ${details}`;
}
