export function hasValidFiftyTwoWeekRange(low: number, high: number): boolean {
  return Number.isFinite(low) && Number.isFinite(high) && high > low;
}

export function getFiftyTwoWeekPosition(
  low: number,
  high: number,
  current: number
): number | null {
  if (!hasValidFiftyTwoWeekRange(low, high) || !Number.isFinite(current)) {
    return null;
  }

  return Math.max(0, Math.min(1, (current - low) / (high - low)));
}
