"use client";

import { createPortal } from "react-dom";
import type { TreeMapNode } from "@/lib/types";
import { formatDollar, formatPercent, formatPrice } from "@/lib/utils";
import { GainLoss } from "./primitives/GainLoss";
import { SymbolLink } from "./primitives/SymbolLink";
import { FiftyTwoWeekRange } from "./primitives/FiftyTwoWeekRange";
import { Badge } from "./primitives/Badge";

interface TreeMapTooltipProps {
  node: TreeMapNode | null;
  mouseX: number;
  mouseY: number;
}

export function TreeMapTooltip({ node, mouseX, mouseY }: TreeMapTooltipProps) {
  if (!node) return null;

  // Position tooltip near the pointer, then clamp it within the viewport.
  const offset = 12;
  const viewportPadding = 16;
  let tooltipWidth = 280;
  const tooltipHeight = 200;

  let left = mouseX + offset;
  let top = mouseY + offset;

  if (typeof window !== "undefined") {
    tooltipWidth = Math.min(
      300,
      Math.max(220, window.innerWidth - viewportPadding * 2)
    );

    if (left + tooltipWidth > window.innerWidth - viewportPadding) {
      left = mouseX - tooltipWidth - offset;
    }
    if (top + tooltipHeight > window.innerHeight - viewportPadding) {
      top = mouseY - tooltipHeight - offset;
    }

    left = clamp(
      left,
      viewportPadding,
      window.innerWidth - tooltipWidth - viewportPadding
    );
    top = clamp(
      top,
      viewportPadding,
      window.innerHeight - tooltipHeight - viewportPadding
    );
  }

  const tooltip = (
    <div
      className="fixed z-[200] pointer-events-none animate-fade-in"
      style={{ left, top }}
    >
      <div
        className="bg-surface/92 backdrop-blur-2xl saturate-150 border border-border/50 rounded-xl p-3.5 shadow-[var(--shadow-xl)] ring-1 ring-inset ring-white/[0.04]"
        style={{ width: tooltipWidth, maxWidth: "calc(100vw - 32px)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <SymbolLink
            symbol={node.symbol}
            className="font-bold text-text-primary text-sm"
            linkClassName="hover:text-accent hover:underline pointer-events-auto"
          />
          {node.investmentType && (
            <Badge label={node.investmentType} />
          )}
        </div>
        <p className="text-xs text-text-muted mb-3 truncate">{node.name}</p>

        {/* Metrics grid */}
        <div className="space-y-1.5">
          {node.currentPrice !== undefined && node.currentPrice > 0 && (
            <TooltipRow label="Price" value={formatPrice(node.currentPrice)} />
          )}
          <TooltipRow label="Value" value={formatDollar(node.value)} />
          <TooltipRow
            label="% Total"
            value={formatPercent(node.percentOfPortfolio)}
          />

          {node.totalGainLossDollar !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Gain/Loss</span>
              <GainLoss
                dollar={node.totalGainLossDollar}
                percent={node.totalGainLossPercent}
                size="sm"
              />
            </div>
          )}

          {node.parentName && (
            <div className="pt-1.5 mt-1.5 border-t border-border">
              <span className="text-[10px] text-text-muted block leading-4">
                Derived from{" "}
                <strong className="text-text-primary">
                  {node.parentName}
                  {node.parentSymbol && (
                    <>
                      {" ("}
                      <SymbolLink
                        symbol={node.parentSymbol}
                        linkClassName="hover:text-accent hover:underline pointer-events-auto"
                      />
                      {")"}
                    </>
                  )}
                </strong>
              </span>
              {node.percentOfParent !== undefined && (
                <span className="text-[10px] text-text-muted block mt-0.5">
                  {node.percentOfParent.toFixed(1)}% of this fund
                </span>
              )}
            </div>
          )}

          {node.account && (
            <span className="text-[10px] text-text-muted block">
              {node.account}
            </span>
          )}
        </div>

        {node.fiftyTwoWeekHigh !== undefined &&
          node.fiftyTwoWeekLow !== undefined &&
          node.currentPrice !== undefined &&
          node.fiftyTwoWeekHigh > 0 && (
            <div className="pt-2 mt-1">
              <span className="text-xs text-text-muted block mb-1">
                52-Week Range
              </span>
              <FiftyTwoWeekRange
                low={node.fiftyTwoWeekLow}
                high={node.fiftyTwoWeekHigh}
                current={node.currentPrice}
                size="sm"
                className="!w-full"
              />
            </div>
          )}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  // Render above content even when ancestors use transforms for entry animations.
  return createPortal(tooltip, document.body);
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xs font-medium text-text-primary tabular-nums">
        {value}
      </span>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
