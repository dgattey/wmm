/**
 * Format a number as a dollar amount: $1,234.56
 */
export function formatDollar(n: number): string {
  if (!isFinite(n)) return "$0.00";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Format a number as a signed percentage: +12.34% or -5.67%
 */
export function formatPercent(n: number): string {
  if (!isFinite(n)) return "0.00%";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Format a number as a price: $123.45
 */
export function formatPrice(n: number): string {
  if (!isFinite(n)) return "$0.00";
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a number compactly: $1.2M, $45.3K, $892
 */
export function formatCompact(n: number): string {
  if (!isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Format a header metric compactly with slightly more precision.
 * Examples: $2.25M, $761k, -$9.4k
 */
export function formatHeaderCurrency(n: number): string {
  if (!isFinite(n)) return "$0";

  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}$${trimTrailingZeros((abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 1 : 2))}B`;
  }

  if (abs >= 1_000_000) {
    return `${sign}$${trimTrailingZeros((abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2))}M`;
  }

  if (abs >= 1_000) {
    if (abs >= 100_000) {
      return `${sign}$${Math.floor(abs / 1_000)}k`;
    }

    return `${sign}$${trimTrailingZeros((abs / 1_000).toFixed(1))}k`;
  }

  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Conditional class name joiner (like clsx/cn)
 */
export function cn(
  ...classes: (string | false | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Deterministic hash for a string → number [0, max)
 */
export function hashString(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

function trimTrailingZeros(value: string): string {
  return value.replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}
