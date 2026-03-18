"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SlidingNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  animate?: boolean;
}

/**
 * Displays a formatted number. On value change, the old value
 * slides out and new value slides in with a smooth transition.
 */
export function SlidingNumber({
  value,
  format,
  className,
  animate = true,
}: SlidingNumberProps) {
  const formatted = format(value);
  const prevValue = useRef(value);
  const [display, setDisplay] = useState(formatted);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"up" | "down">("up");
  const displayedValue = animate ? display : formatted;
  const isSlideTransitioning = animate && isTransitioning;

  useEffect(() => {
    if (!animate) {
      prevValue.current = value;
      return;
    }

    if (prevValue.current !== value) {
      const dir = value > prevValue.current ? "up" : "down";
      prevValue.current = value;
      const startTimer = window.setTimeout(() => {
        setSlideDirection(dir);
        setIsTransitioning(true);
      }, 0);

      // After the exit animation, swap the text and slide it back in
      const swapTimer = window.setTimeout(() => {
        setDisplay(formatted);
        setIsTransitioning(false);
      }, 180);

      return () => {
        window.clearTimeout(startTimer);
        window.clearTimeout(swapTimer);
      };
    }
  }, [animate, value, formatted]);

  return (
    <span
      className={cn("inline-block tabular-nums overflow-hidden", className)}
      aria-label={formatted}
    >
      <span
        className={cn(
          "inline-block transition-all ease-[cubic-bezier(0.16,1,0.3,1)]",
          isSlideTransitioning
            ? slideDirection === "up"
              ? "-translate-y-[30%] opacity-0 blur-[2px]"
              : "translate-y-[30%] opacity-0 blur-[2px]"
            : "translate-y-0 opacity-100 blur-0"
        )}
        style={{
          transitionDuration: isSlideTransitioning ? "150ms" : "300ms",
        }}
      >
        {displayedValue}
      </span>
    </span>
  );
}
