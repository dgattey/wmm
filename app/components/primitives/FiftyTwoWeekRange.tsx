"use client";

import {
  getFiftyTwoWeekPosition,
  hasValidFiftyTwoWeekRange,
} from "@/lib/fiftyTwoWeek";
import { cn, formatPrice } from "@/lib/utils";

interface FiftyTwoWeekRangeProps {
  low: number;
  high: number;
  current: number;
  size?: "sm" | "md";
  className?: string;
}

export function FiftyTwoWeekRange({
  low,
  high,
  current,
  size = "md",
  className,
}: FiftyTwoWeekRangeProps) {
  if (!hasValidFiftyTwoWeekRange(low, high)) return null;

  const position = getFiftyTwoWeekPosition(low, high, current);
  if (position === null) return null;

  return (
    <div
      className={cn(
        "flex flex-col",
        size === "sm" ? "w-24" : "w-40 min-w-[10rem] xl:w-44 xl:min-w-[11rem]",
        className
      )}
    >
      {/* Track with filled portion + dot */}
      <div className="relative h-5 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 h-[3px] bg-border rounded-full overflow-hidden">
          {/* Filled portion */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${position * 100}%`,
              background: "var(--accent)",
              opacity: 0.35,
            }}
          />
        </div>

        {/* Current price dot */}
        <div
          className="absolute -translate-x-1/2 transition-[left] duration-300 ease-out"
          style={{ left: `${position * 100}%` }}
        >
          <div
            className={cn(
              "rounded-full bg-text-primary shadow-sm",
              "ring-2 ring-bg",
              size === "sm" ? "w-[6px] h-[6px]" : "w-[7px] h-[7px]"
            )}
          />
        </div>
      </div>

      {/* Labels */}
      {size === "md" && (
        <div className="flex justify-between -mt-0.5">
          <span className="text-[10px] text-text-muted/70 tabular-nums">
            {formatPrice(low)}
          </span>
          <span className="text-[10px] text-text-muted/70 tabular-nums">
            {formatPrice(high)}
          </span>
        </div>
      )}
    </div>
  );
}
