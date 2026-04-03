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
import { buildEmptyFilterTreeMapNode } from "@/lib/treemapEmptyNode";
import { filterFundTreeMapNodes } from "@/lib/treemap";
import { cn, formatCompact } from "@/lib/utils";
import { SearchOffIcon } from "./icons";
import { TreeMapTooltip } from "./TreeMapTooltip";
import { SymbolLink } from "./primitives/SymbolLink";

interface ZoomTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function applyZoom(x: number, y: number, w: number, h: number, zoom: ZoomTransform | null): Rect {
  if (!zoom) return { left: x, top: y, width: w, height: h };
  return {
    left: x * zoom.scaleX + zoom.offsetX,
    top: y * zoom.scaleY + zoom.offsetY,
    width: w * zoom.scaleX,
    height: h * zoom.scaleY,
  };
}

function isSelectableFund(node: TreeMapNode): boolean {
  return node.depth === 1 && isFundInvestmentType(node.investmentType);
}

function computeZoomTransform(
  selectedNodes: TreeMapNode[],
  scaleX: number,
  scaleY: number,
  containerWidth: number,
  scaledHeight: number
): ZoomTransform | null {
  if (selectedNodes.length === 0) return null;

  const x0 = Math.min(...selectedNodes.map((n) => n.x0)) * scaleX;
  const y0 = Math.min(...selectedNodes.map((n) => n.y0)) * scaleY;
  const x1 = Math.max(...selectedNodes.map((n) => n.x1)) * scaleX;
  const y1 = Math.max(...selectedNodes.map((n) => n.y1)) * scaleY;
  const w = x1 - x0;
  const h = y1 - y0;

  if (w <= 0 || h <= 0) return null;

  return {
    scaleX: containerWidth / w,
    scaleY: scaledHeight / h,
    offsetX: -x0 * (containerWidth / w),
    offsetY: -y0 * (scaledHeight / h),
  };
}

function partitionNodes(nodes: TreeMapNode[]): { parents: TreeMapNode[]; leaves: TreeMapNode[] } {
  const parentSymbols = new Set(
    nodes.filter((n) => n.depth === 2 && n.parentSymbol).map((n) => n.parentSymbol!)
  );

  return {
    parents: nodes.filter((n) => n.depth === 1 && parentSymbols.has(n.symbol)),
    leaves: nodes.filter(
      (n) => n.depth === 2 || (n.depth === 1 && !parentSymbols.has(n.symbol))
    ),
  };
}

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
  const nodesResolved =
    nodes.length === 0
      ? [buildEmptyFilterTreeMapNode(originalWidth, originalHeight)]
      : nodes;

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

  const selectedNodes =
    grouping === "fund" && hasSelectedFunds
      ? filterFundTreeMapNodes(nodesResolved, selectedFunds)
      : [];
  const visibleNodeIds = new Set(selectedNodes.map((node) => node.id));
  const zoomTransform = computeZoomTransform(
    selectedNodes, scaleX, scaleY, containerWidth, scaledHeight
  );

  const { parents: parentNodes, leaves: leafNodes } = partitionNodes(nodesResolved);

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

  function isNodeVisible(node: TreeMapNode): boolean {
    return grouping !== "fund" || !hasSelectedFunds || visibleNodeIds.has(node.id);
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden cursor-default touch-manipulation",
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
          const pos = applyZoom(rawPos.x, rawPos.y, rawPos.w, rawPos.h, zoomTransform);

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
                <SymbolLink
                  symbol={node.symbol}
                  linkClassName="hover:opacity-100 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                />
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
          const pos = applyZoom(rawPos.x, rawPos.y, rawPos.w, rawPos.h, zoomTransform);
          const w = pos.width;
          const h = pos.height;
          const isEmptyFilterTile = Boolean(node.emptyStateMessage);
          const showSymbol =
            !isEmptyFilterTile &&
            visible &&
            w > (isMobile ? 36 : 45) &&
            h > (isMobile ? 20 : 25);
          const showValue =
            !isEmptyFilterTile &&
            visible &&
            w > (isMobile ? 58 : 75) &&
            h > (isMobile ? 30 : 40);

          return (
            <div
              key={node.id}
              className={cn(
                "absolute rounded-lg flex flex-col items-center justify-center",
                enableIntroAnimation && "animate-tile-in",
                "select-none overflow-hidden",
                "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                grouping === "fund" && !isEmptyFilterTile ? "cursor-pointer" : "cursor-default",
                visible &&
                  !isEmptyFilterTile &&
                  "hover:z-20 hover:brightness-110 hover:shadow-[var(--shadow-lg)] hover-lift"
              )}
              style={{
                "--enter-delay": `${160 + Math.min(index, 10) * 18}ms`,
                left: pos.left,
                top: pos.top,
                width: w,
                height: h,
                backgroundColor: isEmptyFilterTile ? "var(--treemap-empty-fill)" : node.color,
                opacity: visible ? 1 : 0,
                transform: visible ? "scale(1)" : "scale(0.85)",
                pointerEvents: visible && !isEmptyFilterTile ? "auto" : "none",
                boxShadow: visible
                  ? "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.06)"
                  : "none",
                border: visible
                  ? isEmptyFilterTile
                    ? "1px solid var(--treemap-empty-border)"
                    : "1px solid rgba(255,255,255,0.08)"
                  : "none",
              } as CSSProperties}
              onMouseEnter={() => visible && !isEmptyFilterTile && setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node);
              }}
            >
              {isEmptyFilterTile && node.emptyStateMessage && (
                <>
                  <SearchOffIcon
                    size={isMobile ? 14 : 16}
                    className="text-text-primary drop-shadow-sm"
                  />
                  <span className="mt-0.5 max-w-[min(100%,18rem)] text-center text-[10px] leading-none text-text-muted drop-shadow-sm">
                    {node.emptyStateMessage}
                  </span>
                </>
              )}
              {showSymbol && (
                <SymbolLink
                  symbol={node.symbol}
                  className="text-white font-bold text-xs drop-shadow-sm leading-none"
                  linkClassName="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                />
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
