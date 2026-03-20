"use client";

import type { ReactNode } from "react";
import {
  isFidelityLinkable,
  getFidelityQuoteUrl,
} from "@/lib/fidelitySymbolLink";
import { cn } from "@/lib/utils";

interface SymbolLinkProps {
  symbol: string;
  children?: ReactNode;
  className?: string;
  /** Extra classes applied only when rendered as an anchor */
  linkClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Renders a symbol as a Fidelity quote link when linkable, otherwise as a span.
 * Children default to the symbol text if not provided.
 */
export function SymbolLink({
  symbol,
  children,
  className,
  linkClassName,
  onClick,
}: SymbolLinkProps) {
  const content = children ?? symbol;

  if (isFidelityLinkable(symbol)) {
    return (
      <a
        href={getFidelityQuoteUrl(symbol)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className, linkClassName)}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return <span className={className}>{content}</span>;
}
