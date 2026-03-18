"use client";

import { cn, formatDollar, formatPercent } from "@/lib/utils";

interface GainLossProps {
  dollar?: number;
  percent?: number;
  size?: "sm" | "md";
  className?: string;
  formatDollarValue?: (value: number) => string;
  formatPercentValue?: (value: number) => string;
}

export function GainLoss({
  dollar,
  percent,
  size = "md",
  className,
  formatDollarValue = formatDollar,
  formatPercentValue = formatPercent,
}: GainLossProps) {
  const value = dollar ?? percent ?? 0;
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        size === "sm" ? "text-xs" : "text-sm",
        isPositive && "text-positive",
        isNegative && "text-negative",
        !isPositive && !isNegative && "text-text-muted",
        className
      )}
    >
      {dollar !== undefined && formatDollarValue(dollar)}
      {dollar !== undefined && percent !== undefined && (
        <span className="text-text-muted mx-0.5">/</span>
      )}
      {percent !== undefined && formatPercentValue(percent)}
    </span>
  );
}
