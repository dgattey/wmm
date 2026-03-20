"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getColorForSymbol } from "@/lib/colors";
import { SymbolLink } from "./SymbolLink";

interface TickerIdentityProps {
  symbol: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** When true (default), wrap the symbol text in a Fidelity quote link */
  linkToFidelity?: boolean;
}

const SIZE_CONFIG = {
  sm: { logo: 24, text: "text-xs", nameText: "text-xs", gap: "gap-2" },
  md: { logo: 32, text: "text-sm", nameText: "text-sm", gap: "gap-2.5" },
  lg: { logo: 40, text: "text-base", nameText: "text-base", gap: "gap-3" },
};

export function TickerIdentity({
  symbol,
  name,
  size = "md",
  className,
  linkToFidelity = true,
}: TickerIdentityProps) {
  const [imgError, setImgError] = useState(false);
  const config = SIZE_CONFIG[size];
  const avatarColor = getColorForSymbol(symbol);
  const avatarText = symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 2) || symbol.slice(0, 2);
  const logoUrl = `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <div
        className="flex-shrink-0 rounded-full overflow-hidden"
        style={{ width: config.logo, height: config.logo }}
      >
        {!imgError ? (
          <Image
            src={logoUrl}
            alt={`${symbol} logo`}
            width={config.logo}
            height={config.logo}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{
              backgroundColor: avatarColor,
              fontSize: config.logo * 0.38,
            }}
          >
            {avatarText}
          </div>
        )}
      </div>

      <div className="min-w-0">
        {linkToFidelity ? (
          <SymbolLink
            symbol={symbol}
            className={cn("font-semibold text-text-primary", config.text)}
            linkClassName="hover:text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-bg rounded"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={cn("font-semibold text-text-primary", config.text)}>
            {symbol}
          </span>
        )}
        <div
          className={cn(
            "text-text-muted truncate max-w-[180px]",
            config.nameText
          )}
        >
          {name}
        </div>
      </div>
    </div>
  );
}
