"use client";

import type { TreeMapNode } from "@/lib/types";
import { formatDollar, formatPercent, formatPrice } from "@/lib/utils";
import { GainLoss } from "./primitives/GainLoss";
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

  return (
    <div
      className="fixed z-50 pointer-events-none animate-fade-in"
      style={{ left, top }}
    >
      <div
        className="bg-surface/92 backdrop-blur-2xl saturate-150 border border-border/50 rounded-xl p-3.5 shadow-[var(--shadow-xl)] ring-1 ring-inset ring-white/[0.04]"
        style={{ width: tooltipWidth, maxWidth: "calc(100vw - 32px)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-text-primary text-sm">
            {node.symbol}
          </span>
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
            label="Portfolio"
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

          {node.fiftyTwoWeekHigh !== undefined &&
            node.fiftyTwoWeekLow !== undefined &&
            node.currentPrice !== undefined &&
            node.fiftyTwoWeekHigh > 0 && (
              <div className="pt-1">
                <span className="text-xs text-text-muted block mb-1">
                  52-Week Range
                </span>
                <FiftyTwoWeekRange
                  low={node.fiftyTwoWeekLow}
                  high={node.fiftyTwoWeekHigh}
                  current={node.currentPrice}
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
                  {node.parentSymbol ? ` (${node.parentSymbol})` : ""}
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
      </div>
    </div>
  );
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
