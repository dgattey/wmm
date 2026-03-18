"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  animate?: boolean;
}

export function AnimatedNumber({
  value,
  format,
  className,
  animate = true,
}: AnimatedNumberProps) {
  const prevValue = useRef(value);
  const [flashClass, setFlashClass] = useState<string | null>(null);
  const activeFlashClass = animate ? flashClass : null;

  useEffect(() => {
    if (!animate) {
      prevValue.current = value;
      return;
    }

    if (prevValue.current !== value) {
      const direction = value > prevValue.current ? "positive" : "negative";
      prevValue.current = value;
      let clearTimer: number | undefined;
      const startTimer = window.setTimeout(() => {
        setFlashClass(direction);
        clearTimer = window.setTimeout(() => setFlashClass(null), 600);
      }, 0);

      return () => {
        window.clearTimeout(startTimer);
        if (clearTimer !== undefined) {
          window.clearTimeout(clearTimer);
        }
      };
    }
  }, [animate, value]);

  return (
    <span
      className={cn(
        "tabular-nums transition-colors duration-300",
        activeFlashClass === "positive" && "animate-[flash-positive_600ms_ease-out]",
        activeFlashClass === "negative" && "animate-[flash-negative_600ms_ease-out]",
        className
      )}
    >
      {format(value)}
    </span>
  );
}
