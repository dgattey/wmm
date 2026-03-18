"use client";

import {
  useRef,
  useState,
  useEffect,
  type CSSProperties,
  type MouseEvent,
} from "react";
import type { TreeMapGrouping, TreeMapNode } from "@/lib/types";
import { isFundInvestmentType } from "@/lib/investmentTypes";
import { filterFundTreeMapNodes } from "@/lib/treemap";
import { cn, formatCompact } from "@/lib/utils";
import {
  isFidelityLinkable,
  getFidelityQuoteUrl,
} from "@/lib/fidelitySymbolLink";
import { TreeMapTooltip } from "./TreeMapTooltip";

interface TreeMapProps {
  nodes: TreeMapNode[];
  originalWidth?: number;
  originalHeight?: number;
  grouping: TreeMapGrouping;
  selectedFunds: string[];
  onToggleFund?: (symbol: string) => void;
  onClearFunds?: () => void;
  isMobile?: boolean;
  enableIntroAnimation?: boolean;
}

export function TreeMap({
  nodes,
  originalWidth = 1200,
  originalHeight = 400,
  grouping,
  selectedFunds,
  onToggleFund,
  onClearFunds,
  isMobile = false,
  enableIntroAnimation = true,
}: TreeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(originalWidth);
  const [hoveredNode, setHoveredNode] = useState<TreeMapNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scaleX = containerWidth / originalWidth;
  const scaleY = scaleX;
  const scaledHeight = originalHeight * scaleY;

  const hasSelectedFunds = selectedFunds.length > 0;

  // Compute zoom for the current fund selection by fitting the selected group bounds.
  let zoomTransform: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
  } | null = null;

  const selectedNodes =
    grouping === "fund" && hasSelectedFunds
      ? filterFundTreeMapNodes(nodes, selectedFunds)
      : [];
  const visibleNodeIds = new Set(selectedNodes.map((node) => node.id));

  if (selectedNodes.length > 0) {
    const x0 = Math.min(...selectedNodes.map((node) => node.x0)) * scaleX;
    const y0 = Math.min(...selectedNodes.map((node) => node.y0)) * scaleY;
    const x1 = Math.max(...selectedNodes.map((node) => node.x1)) * scaleX;
    const y1 = Math.max(...selectedNodes.map((node) => node.y1)) * scaleY;
    const selectionWidth = x1 - x0;
    const selectionHeight = y1 - y0;

    if (selectionWidth > 0 && selectionHeight > 0) {
      zoomTransform = {
        scaleX: containerWidth / selectionWidth,
        scaleY: scaledHeight / selectionHeight,
        offsetX: -x0 * (containerWidth / selectionWidth),
        offsetY: -y0 * (scaledHeight / selectionHeight),
      };
    }
  }

  // Separate parent (depth 1 with children) and leaf nodes
  const parentNodes = nodes.filter(
    (n) => n.depth === 1 && nodes.some((c) => c.parentSymbol === n.symbol)
  );
  const leafNodes = nodes.filter((n) => {
    if (n.depth === 1 && !nodes.some((c) => c.parentSymbol === n.symbol))
      return true;
    if (n.depth === 2) return true;
    return false;
  });

  function handleMouseMove(e: MouseEvent) {
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  function handleNodeClick(node: TreeMapNode) {
    if (grouping !== "fund" || !onToggleFund) return;

    if (node.depth === 1 && isSelectableFund(node)) {
      onToggleFund(node.symbol);
    } else if (node.depth === 2 && node.parentSymbol) {
      onToggleFund(node.parentSymbol);
    }
  }

  function handleContainerClick(e: MouseEvent) {
    if (e.target === containerRef.current && hasSelectedFunds && onClearFunds) {
      onClearFunds();
    }
  }

  if (nodes.length === 0) {
    return (
      <div
        className={cn(
          "w-full rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted",
          isMobile ? "h-[280px]" : "h-[400px]"
        )}
      >
        Loading treemap...
      </div>
    );
  }

  function getTransformedPos(x: number, y: number, w: number, h: number) {
    if (!zoomTransform) return { left: x, top: y, width: w, height: h };
    return {
      left: x * zoomTransform.scaleX + zoomTransform.offsetX,
      top: y * zoomTransform.scaleY + zoomTransform.offsetY,
      width: w * zoomTransform.scaleX,
      height: h * zoomTransform.scaleY,
    };
  }

  function isNodeVisible(node: TreeMapNode): boolean {
    return grouping !== "fund" || !hasSelectedFunds || visibleNodeIds.has(node.id);
  }

  function isSelectableFund(node: TreeMapNode): boolean {
    return node.depth === 1 && isFundInvestmentType(node.investmentType);
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-surface border border-border/60 shadow-[var(--shadow-md)] cursor-default touch-manipulation",
          enableIntroAnimation && "animate-soft-rise"
        )}
        style={
          {
            height: scaledHeight,
            "--enter-delay": "40ms",
          } as CSSProperties
        }
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
      >
        {/* Parent group backgrounds */}
        {parentNodes.map((node, index) => {
          const visible = isNodeVisible(node);
          const rawPos = {
            x: node.x0 * scaleX,
            y: node.y0 * scaleY,
            w: (node.x1 - node.x0) * scaleX,
            h: (node.y1 - node.y0) * scaleY,
          };
          const pos = getTransformedPos(rawPos.x, rawPos.y, rawPos.w, rawPos.h);

          return (
            <div
              key={`group-${node.id}`}
              className={cn(
                "absolute rounded-lg",
                enableIntroAnimation && "animate-soft-pop",
                "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                grouping === "fund" && "cursor-pointer"
              )}
              style={{
                "--enter-delay": `${120 + index * 20}ms`,
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                backgroundColor: `${node.color}15`,
                border: `1px solid ${node.color}30`,
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? "auto" : "none",
              } as CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node);
              }}
            >
              <span
                className="absolute top-0.5 left-1.5 text-[10px] font-semibold truncate opacity-70 transition-opacity duration-300"
                style={{
                  color: node.color,
                  maxWidth: pos.width - 8,
                }}
              >
                {isFidelityLinkable(node.symbol) ? (
                  <a
                    href={getFidelityQuoteUrl(node.symbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-100 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {node.symbol}
                  </a>
                ) : (
                  node.symbol
                )}
              </span>
            </div>
          );
        })}

        {/* Leaf nodes (interactive) */}
        {leafNodes.map((node, index) => {
          const visible = isNodeVisible(node);
          const rawPos = {
            x: node.x0 * scaleX,
            y: node.y0 * scaleY,
            w: (node.x1 - node.x0) * scaleX,
            h: (node.y1 - node.y0) * scaleY,
          };
          const pos = getTransformedPos(rawPos.x, rawPos.y, rawPos.w, rawPos.h);
          const w = pos.width;
          const h = pos.height;
          const showSymbol = visible && w > (isMobile ? 36 : 45) && h > (isMobile ? 20 : 25);
          const showValue = visible && w > (isMobile ? 58 : 75) && h > (isMobile ? 30 : 40);

          return (
            <div
              key={node.id}
              className={cn(
                "absolute rounded-lg flex flex-col items-center justify-center",
                enableIntroAnimation && "animate-tile-in",
                "select-none overflow-hidden",
                "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                grouping === "fund" ? "cursor-pointer" : "cursor-default",
                visible &&
                  "hover:z-20 hover:brightness-110 hover:shadow-[var(--shadow-lg)] hover-lift"
              )}
              style={{
                "--enter-delay": `${160 + Math.min(index, 10) * 18}ms`,
                left: pos.left,
                top: pos.top,
                width: w,
                height: h,
                backgroundColor: node.color,
                opacity: visible ? 1 : 0,
                transform: visible ? "scale(1)" : "scale(0.85)",
                pointerEvents: visible ? "auto" : "none",
                boxShadow: visible
                  ? "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.06)"
                  : "none",
                border: visible ? "1px solid rgba(255,255,255,0.08)" : "none",
              } as CSSProperties}
              onMouseEnter={() => visible && setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node);
              }}
            >
              {showSymbol && (
                <span className="text-white font-bold text-xs drop-shadow-sm leading-none">
                  {isFidelityLinkable(node.symbol) ? (
                    <a
                      href={getFidelityQuoteUrl(node.symbol)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {node.symbol}
                    </a>
                  ) : (
                    node.symbol
                  )}
                </span>
              )}
              {showValue && (
                <span className="text-white/80 text-[10px] mt-0.5 drop-shadow-sm leading-none">
                  {formatCompact(node.value)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <TreeMapTooltip
        node={hoveredNode}
        mouseX={mousePos.x}
        mouseY={mousePos.y}
      />

      {isMobile && grouping === "fund" && (
        <p className="mt-2 px-1 text-xs text-text-muted">
          Tap a fund to focus the treemap. Tap empty space to reset.
        </p>
      )}
    </div>
  );
}
