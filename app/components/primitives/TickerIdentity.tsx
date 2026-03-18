"use client";

import { useState } from "react";
import { cn, hashString } from "@/lib/utils";

interface TickerIdentityProps {
  symbol: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AVATAR_COLORS = [
  "#5B7BA8", "#8B74AB", "#4E9999", "#C49A5C", "#5E9E74",
  "#B86B6B", "#7A8FB8", "#9C7EA0", "#6A9B8F", "#C08B56",
  "#7BAA6C", "#A87B8E", "#5E8EA8", "#B07878",
];

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
}: TickerIdentityProps) {
  const [imgError, setImgError] = useState(false);
  const config = SIZE_CONFIG[size];
  const avatarColor = AVATAR_COLORS[hashString(symbol, AVATAR_COLORS.length)];
  const avatarText = symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 2) || symbol.slice(0, 2);
  const logoUrl = `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      {/* Fall back to a deterministic avatar when a remote logo 404s. */}
      <div
        className="flex-shrink-0 rounded-full overflow-hidden"
        style={{ width: config.logo, height: config.logo }}
      >
        {!imgError ? (
          <img
            src={logoUrl}
            alt={symbol}
            width={config.logo}
            height={config.logo}
            className="w-full h-full object-cover"
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

      {/* Symbol + Name */}
      <div className="min-w-0">
        <div className={cn("font-semibold text-text-primary", config.text)}>
          {symbol}
        </div>
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
