import type { TreeMapNode } from "@/lib/types";

const EMPTY_NODE_ID = "__filter-empty__";

/** Single full-canvas tile so TreeMap uses the same leaf path as populated data. */
export function buildEmptyFilterTreeMapNode(
  width: number,
  height: number
): TreeMapNode {
  return {
    id: EMPTY_NODE_ID,
    symbol: EMPTY_NODE_ID,
    name: "No results",
    value: 0,
    /** Unused when `emptyStateMessage` is set — fill comes from `--treemap-empty-fill`. */
    color: "#808080",
    percentOfPortfolio: 0,
    x0: 0,
    y0: 0,
    x1: width,
    y1: height,
    depth: 1,
    emptyStateMessage: "No results found",
  };
}
