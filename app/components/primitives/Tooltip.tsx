"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-0 top-full z-50 mt-2 w-max max-w-xs rounded-lg border border-border/80 bg-surface px-3 py-1.5",
            "text-left text-xs leading-5 text-text-primary shadow-[var(--shadow-lg)]"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
